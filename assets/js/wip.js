'use strict';

/**
 * "Under construction" pixel scene for work categories that have no projects yet.
 * script.js shows the scene (adds .active) whenever a filter leaves the grid empty;
 * this file only draws it: two barricades with blinking lamps, caution tape whose
 * stripes crawl along, and a traffic cone in the middle.
 */

(function () {

  const scene = document.querySelector('[data-wip]');
  const canvas = document.querySelector('[data-wip-canvas]');
  if (!scene || !canvas) return;

  const ctx = canvas.getContext('2d');
  // same recipe as the mailbox: lay out on a coarse grid, draw at 2x so the outline is one fine pixel
  const S = 2;
  const BW = 72;
  const BH = 30;
  const W = canvas.width = BW * S;
  const H = canvas.height = BH * S;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = {
    outline: '#3b2340',
    tape: '#ffd23f', tapeDark: '#5e4c6e',
    board: '#ff8a3d', boardLight: '#fff8ec',
    leg: '#8a5a3c', legShade: '#6b4128',
    lampOn: '#ffd23f', lampGlow: '#fff3b0', lampOff: '#9a7a3c', lampPost: '#5a4a5e',
    cone: '#ff7a2e', coneShade: '#d95a1a', coneBand: '#fff8ec',
    grass: '#7be0a0', grassShade: '#4fae78'
  };

  let frame = 0;

  const draw = function () {
    const grid = [];
    for (let y = 0; y < BH; y++) grid.push(new Array(BW).fill(null));
    const set = function (x, y, c) { if (x >= 0 && x < BW && y >= 0 && y < BH) grid[y][x] = c; };
    const rect = function (x0, y0, x1, y1, c) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
    };

    // ground + grass tufts
    rect(1, 27, 70, 29, C.grassShade);
    rect(2, 26, 69, 26, C.grass);
    [5, 27, 44, 62].forEach(function (x) { set(x, 25, C.grass); set(x + 1, 24, C.grass); });

    // sawhorse barricade: striped board on splayed legs, a lamp on top
    const barricade = function (x0, lit) {
      // legs (drawn first so the board sits over their tops)
      for (let y = 14; y <= 25; y++) {
        const k = Math.floor((y - 14) / 4);
        set(x0 + 2 - k, y, C.leg); set(x0 + 3 - k, y, C.legShade);
        set(x0 + 13 + k, y, C.leg); set(x0 + 14 + k, y, C.legShade);
      }
      // board with diagonal stripes
      for (let y = 11; y <= 14; y++) {
        for (let x = x0; x <= x0 + 16; x++) set(x, y, Math.floor((x - y + 40) / 3) % 2 ? C.board : C.boardLight);
      }
      // lamp
      rect(x0 + 8, 9, x0 + 8, 10, C.lampPost);
      rect(x0 + 7, 6, x0 + 9, 8, lit ? C.lampOn : C.lampOff);
      if (lit) {
        set(x0 + 7, 6, C.lampGlow);
        set(x0 + 6, 4, C.lampGlow); set(x0 + 10, 4, C.lampGlow); set(x0 + 8, 3, C.lampGlow);
        set(x0 + 4, 7, C.lampGlow); set(x0 + 12, 7, C.lampGlow);
      }
    };

    const blink = Math.floor(frame / 5) % 2;
    barricade(3, blink === 0);
    barricade(52, blink === 1);

    // caution tape between the boards, sagging a little; its stripes crawl to the right
    const tx0 = 20;
    const tx1 = 51;
    for (let x = tx0; x <= tx1; x++) {
      const t = (x - tx0) / (tx1 - tx0);
      const top = 12 + Math.round(4 * Math.sin(Math.PI * t));
      for (let y = top; y <= top + 2; y++) {
        set(x, y, Math.floor((x - y - frame + 400) / 2) % 3 === 0 ? C.tapeDark : C.tape);
      }
    }

    // traffic cone in front of the tape
    rect(30, 25, 42, 25, C.coneShade);
    rect(31, 24, 41, 24, C.cone);
    for (let y = 12; y <= 23; y++) {
      const half = Math.floor((y - 12) / 3) + 1;
      const band = y === 17 || y === 18;
      rect(36 - half, y, 36 + half - 1, y, band ? C.coneBand : C.cone);
      set(36 + half - 1, y, band ? C.coneBand : C.coneShade);
    }

    // upscale to the fine grid, then outline pass
    const fine = [];
    for (let y = 0; y < H; y++) {
      const row = new Array(W);
      for (let x = 0; x < W; x++) row[x] = grid[Math.floor(y / S)][Math.floor(x / S)];
      fine.push(row);
    }
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let c = fine[y][x];
        if (!c) {
          const n = (y > 0 && fine[y - 1][x]) || (y < H - 1 && fine[y + 1][x]) ||
                    (x > 0 && fine[y][x - 1]) || (x < W - 1 && fine[y][x + 1]);
          if (!n) continue;
          c = C.outline;
        }
        const v = parseInt(c.slice(1), 16);
        const i = (y * W + x) * 4;
        img.data[i] = (v >> 16) & 255; img.data[i + 1] = (v >> 8) & 255; img.data[i + 2] = v & 255; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  draw();
  if (reduceMotion) return;

  // tick only while the scene is on screen (an empty filter is selected and the About tab is open)
  setInterval(function () {
    if (!scene.offsetParent) return;
    frame++;
    draw();
  }, 110);

})();
