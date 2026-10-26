'use strict';

/**
 * Pixel-art icon set. Replaces the contents of every <ion-icon name="..."> with a crisp,
 * fixed-size SVG drawn from the grids below ("#" = one 2x2 px block). The <ion-icon> tags stay, so
 * existing CSS that targets them (sizes, display) keeps working; colors follow currentColor.
 */

(function () {

  // bold 2px-per-pixel set: every "#" renders as a 2x2 CSS-pixel block
  const ICONS = {
    'book-outline': [
      '.###..###.',
      '#...##...#',
      '#.#.##.#.#',
      '#...##...#',
      '#.#.##.#.#',
      '#...##...#',
      '#...##...#',
      '.###..###.',
      '....##....'
    ],
    'briefcase-outline': [
      '...####...',
      '...#..#...',
      '##########',
      '#........#',
      '#........#',
      '####..####',
      '#...##...#',
      '#........#',
      '##########'
    ],
    'mail-outline': [
      '##########',
      '##......##',
      '#.#....#.#',
      '#..#..#..#',
      '#...##...#',
      '#........#',
      '#........#',
      '##########'
    ],
    'phone-portrait-outline': [
      '######',
      '#....#',
      '#....#',
      '#....#',
      '#....#',
      '#....#',
      '#....#',
      '######',
      '##..##',
      '######'
    ],
    'location-outline': [
      '..####..',
      '.######.',
      '###..###',
      '##....##',
      '##....##',
      '###..###',
      '.######.',
      '..####..',
      '...##...',
      '...##...'
    ],
    'chevron-down': [
      '##....##',
      '###..###',
      '.######.',
      '..####..',
      '...##...'
    ],
    'chevron-back-outline': [
      '...##',
      '..###',
      '.###.',
      '###..',
      '###..',
      '.###.',
      '..###',
      '...##'
    ],
    'chevron-forward-outline': [
      '##...',
      '###..',
      '.###.',
      '..###',
      '..###',
      '.###.',
      '###..',
      '##...'
    ],
    'close-outline': [
      '##....##',
      '###..###',
      '.######.',
      '..####..',
      '..####..',
      '.######.',
      '###..###',
      '##....##'
    ],
    'eye-outline': [
      '...####...',
      '.##....##.',
      '#...##...#',
      '#..####..#',
      '#...##...#',
      '.##....##.',
      '...####...'
    ],
    'open-outline': [
      '.....#####',
      '.......###',
      '......##.#',
      '####.##..#',
      '#...##....',
      '#..##.....',
      '#.........',
      '#........#',
      '#........#',
      '##########'
    ],
    'paper-plane': [
      '........##',
      '.....#####',
      '..####..##',
      '###....#.#',
      '.##...#..#',
      '..##.#...#',
      '..####..#.',
      '..##.#.#..',
      '..#...##..'
    ],
    'sunny-outline': [
      '....#....',
      '.#.....#.',
      '...###...',
      '..#####..',
      '#.#####.#',
      '..#####..',
      '...###...',
      '.#.....#.',
      '....#....'
    ],
    'moon-outline': [
      '...####..',
      '..###....',
      '.###.....',
      '.###.....',
      '.###.....',
      '.####...#',
      '..######.',
      '...####..'
    ],
    'logo-linkedin': [
      '.########.',
      '##.#######',
      '##########',
      '##.##...##',
      '##.##.##.#',
      '##.##.##.#',
      '##.##.##.#',
      '##.##.##.#',
      '##########',
      '.########.'
    ]
  };

  const PX = 2;   // CSS pixels per art pixel, shared with the other pixel art on the page

  const NS = 'http://www.w3.org/2000/svg';

  // one path of unit squares, centered in a 16x16 box
  const buildSvg = function (rows) {
    const h = rows.length;
    const w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    let d = '';
    rows.forEach(function (row, y) {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') d += 'M' + x + ' ' + y + 'h1v1h-1z';
      }
    });
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', w * PX);
    svg.setAttribute('height', h * PX);
    svg.setAttribute('class', 'pixel-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('shape-rendering', 'crispEdges');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);
    return svg;
  };

  document.querySelectorAll('ion-icon[name]').forEach(function (el) {
    const rows = ICONS[el.getAttribute('name')];
    if (!rows) return;
    el.replaceChildren(buildSvg(rows));
  });

})();
