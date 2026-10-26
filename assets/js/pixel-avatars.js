'use strict';

/**
 * Pixel-art testimonial portraits, drawn procedurally on 32x32 canvases.
 * Each face is built from simple shapes (head, hair, eyes, mouth, accessories)
 * with a dark outline and side shading, so it reads as hand-made pixel art rather
 * than a mosaic of a photo. The face can turn: tx / ty in [-1, 1] shift the features,
 * hair and ears to fake a head turn. The testimonial modal's portrait follows the cursor.
 */

(function () {

  const SIZE = 32;

  const PEOPLE = {
    leota: {
      skin: '#f7cba3', skinShade: '#e3a67f',
      hair: '#f1c46b', hairShade: '#d39f45',
      iris: '#3f9be0', brow: '#c08a3a', blush: '#f4a3a3',
      style: 'long'
    },
    jiahua: {
      skin: '#f2c19b', skinShade: '#d89c74', shine: '#fde3cc',
      beard: '#6b4128', beardShade: '#4f2f1c',
      iris: '#3a2418', brow: '#4f2f1c',
      style: 'bald'
    },
    chuan: {
      skin: '#f0c09a', skinShade: '#d69b72',
      hair: '#2a1f1a', cap: '#2b2b33', capShade: '#1c1c22', capShine: '#4a4a56',
      iris: '#2a1a14', brow: '#2a1f1a', glasses: '#18181d',
      style: 'cap'
    }
  };

  const OUTLINE = '#3b2340';
  const MOUTH = '#8e2b3a';
  const TEETH = '#ffffff';
  const TONGUE = '#e5677a';
  const EYE_WHITE = '#ffffff';
  const PUPIL = '#1e1218';

  const inEllipse = function (x, y, cx, cy, rx, ry) {
    const dx = (x + 0.5 - cx) / rx;
    const dy = (y + 0.5 - cy) / ry;
    return dx * dx + dy * dy <= 1;
  };

  // build a 32x32 color grid for one person at a given turn
  const buildGrid = function (p, tx, ty, blink) {
    const grid = [];
    for (let y = 0; y < SIZE; y++) grid.push(new Array(SIZE).fill(null));
    const set = function (x, y, c) {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) grid[y][x] = c;
    };

    const hx = 16 + tx * 0.8;            // head center shifts a little
    const hy = 16.5 + ty * 0.5;
    const rx = 9.6;
    const ry = 10.8;
    const fx = 16 + tx * 2.4;            // facial features shift more (parallax = turn)
    const fy = 17 + ty * 1.6;

    // long hair behind the head (shifts the opposite way)
    if (p.style === 'long') {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          // shoulder-length hair framing the sides of the face (nothing under the chin)
          const bx = hx - tx * 0.6;
          const sides = Math.abs(x + 0.5 - bx) > rx - 3.5;
          if (inEllipse(x, y, bx, hy + 2, rx + 2.2, ry + 3) && y > hy - 4 && sides && y + 0.5 < hy + ry + 2) {
            set(x, y, x + 0.5 > hx - tx * 0.6 + 3 ? p.hairShade : p.hair);
          }
        }
      }
    }

    // ears (move opposite to the face)
    const earDx = rx - 0.3;
    [-1, 1].forEach(function (side) {
      const ex = hx + side * earDx - tx * 1.1;
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (inEllipse(x, y, ex, fy - 0.5, 1.8, 2.6)) set(x, y, p.skinShade);
        }
      }
    });

    // head with side shading away from where the face points
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (!inEllipse(x, y, hx, hy, rx, ry)) continue;
        const nx = (x + 0.5 - hx) / rx;
        const ny = (y + 0.5 - hy) / ry;
        const shade = nx > 0.62 + tx * 0.25 || ny > 0.82;
        set(x, y, shade ? p.skinShade : p.skin);
      }
    }

    // bald shine
    if (p.style === 'bald') {
      set(hx - 4 + tx, hy - 7, p.shine); set(hx - 3 + tx, hy - 7, p.shine); set(hx - 4 + tx, hy - 6, p.shine);
    }

    // beard: lower face, framing the mouth
    if (p.style === 'bald') {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const inHead = inEllipse(x, y, hx, hy + 0.6, rx + 0.4, ry + 0.8);
          if (!inHead || y + 0.5 < fy + 1.5) continue;
          // leave cheeks clear near the eyes
          if (y + 0.5 < fy + 3 && Math.abs(x + 0.5 - fx) < 5) continue;
          set(x, y, x + 0.5 > hx + 3 + tx * 2 ? p.beardShade : p.beard);
        }
      }
    }

    // hair on top / cap
    if (p.style === 'long') {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (!inEllipse(x, y, hx, hy - 0.5, rx + 0.8, ry + 0.6)) continue;
          // side-swept bangs: hairline slopes from low on the left to high on the right
          const hairline = hy - 4.2 - (x + 0.5 - fx) * 0.35 + ty * 0.6;
          const side = Math.abs(x + 0.5 - hx) > rx - 1.6 && y + 0.5 < hy + 4;
          if (y + 0.5 < hairline || side) set(x, y, x + 0.5 > hx + 4 ? p.hairShade : p.hair);
        }
      }
    }

    if (p.style === 'cap') {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (!inEllipse(x, y, hx, hy - 1, rx + 0.9, ry + 0.4)) continue;
          // short dark hair at the temples
          if (y + 0.5 < hy - 1 && Math.abs(x + 0.5 - hx) > rx - 0.9) set(x, y, p.hair);
          // dome of the (backwards) cap
          if (y + 0.5 < hy - 3.5 + ty * 0.6) {
            set(x, y, x + 0.5 > hx + 3 ? p.capShade : p.cap);
          }
        }
      }
      // band + snap strip at the front, shifted with the turn
      for (let x = Math.round(hx - rx); x <= Math.round(hx + rx); x++) {
        if (grid[Math.round(hy - 4 + ty * 0.6)] && grid[Math.round(hy - 4 + ty * 0.6)][x]) set(x, hy - 4 + ty * 0.6, p.capShade);
      }
      set(fx - 1, hy - 7, p.capShine); set(fx, hy - 7, p.capShine); set(fx + 1, hy - 7, p.capShine);
    }

    // eyebrows
    [-1, 1].forEach(function (side) {
      const ex = fx + side * 4;
      for (let i = -1; i <= 1; i++) set(ex + i, fy - 4, p.brow);
      if (p.style === 'bald') set(ex - side * 2, fy - 4, p.brow);
    });

    // eyes: 3x3 white with a 2x2 iris that looks toward the cursor
    const px = Math.round(tx * 1.2);
    const py = Math.round(ty * 1.0);
    [-1, 1].forEach(function (side) {
      const ex = Math.round(fx + side * 4) - 1;
      const ey = Math.round(fy - 2);
      if (blink) {
        for (let i = 0; i < 3; i++) set(ex + i, ey + 1, OUTLINE);
        return;
      }
      for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) set(ex + x, ey + y, EYE_WHITE);
      const ix = ex + Math.max(0, Math.min(1, 0.5 + px * 0.5 + 0.25));
      const iy = ey + Math.max(0, Math.min(1, 0.5 + py * 0.5));
      set(ix, iy, p.iris); set(ix + 1, iy, p.iris); set(ix, iy + 1, p.iris); set(ix + 1, iy + 1, PUPIL);
    });

    // glasses
    if (p.style === 'cap') {
      [-1, 1].forEach(function (side) {
        const gx = Math.round(fx + side * 4) - 2;
        const gy = Math.round(fy - 3);
        for (let i = 0; i < 5; i++) { set(gx + i, gy, p.glasses); set(gx + i, gy + 4, p.glasses); }
        for (let i = 0; i < 5; i++) { set(gx, gy + i, p.glasses); set(gx + 4, gy + i, p.glasses); }
      });
      set(fx - 1, fy - 2, p.glasses); set(fx, fy - 2, p.glasses); set(fx + 1, fy - 2, p.glasses);
    }

    // nose shadow
    set(fx + 1, fy + 1, p.skinShade);
    set(fx + 1, fy + 2, p.skinShade);

    // cheeks
    if (p.blush) { set(fx - 6, fy + 2, p.blush); set(fx + 6, fy + 2, p.blush); }

    // big open smile
    const my = Math.round(fy + 4);
    const mx = Math.round(fx);
    for (let x = -3; x <= 3; x++) set(mx + x, my, TEETH);
    for (let x = -3; x <= 3; x++) set(mx + x, my + 1, MOUTH);
    for (let x = -2; x <= 2; x++) set(mx + x, my + 2, MOUTH);
    set(mx - 1, my + 2, TONGUE); set(mx, my + 2, TONGUE); set(mx + 1, my + 2, TONGUE);
    set(mx - 4, my - 1, OUTLINE); set(mx + 4, my - 1, OUTLINE);   // smile corners

    // mustache over the smile
    if (p.style === 'bald') for (let x = -3; x <= 3; x++) set(mx + x, my - 1, p.beard);

    // 1px outline around everything
    const out = grid.map(function (row) { return row.slice(); });
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (grid[y][x]) continue;
        const n = (y > 0 && grid[y - 1][x]) || (y < SIZE - 1 && grid[y + 1][x]) ||
                  (x > 0 && grid[y][x - 1]) || (x < SIZE - 1 && grid[y][x + 1]);
        if (n) out[y][x] = OUTLINE;
      }
    }
    return out;
  };

  const hexToRgb = function (hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  const render = function (canvas, tx, ty, blink) {
    const person = PEOPLE[canvas.dataset.pixelAvatar];
    if (!person) return;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(SIZE, SIZE);
    const grid = buildGrid(person, tx || 0, ty || 0, blink);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const c = grid[y][x];
        if (!c) continue;
        const rgb = hexToRgb(c);
        const i = (y * SIZE + x) * 4;
        img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  window.renderPixelAvatar = render;

  // static portraits on the cards
  document.querySelectorAll('canvas[data-pixel-avatar]').forEach(function (c) { render(c, 0, 0, false); });


  /* modal portrait follows the cursor (or looks around on touch screens) */

  const modalCanvas = document.querySelector('canvas[data-modal-img]');
  const modalContainer = document.querySelector('[data-modal-container]');
  if (!modalCanvas || !modalContainer) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let lastPointer = -Infinity;
  let blinkUntil = 0;
  let nextBlink = 0;
  let drawn = '';

  const lookAt = function (x, y) {
    lastPointer = performance.now();
    const r = modalCanvas.getBoundingClientRect();
    look.tx = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / 260));
    look.ty = Math.max(-1, Math.min(1, (y - (r.top + r.height / 2)) / 220));
  };

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    lookAt(e.clientX, e.clientY);
  });

  // touch screens: the portrait turns toward wherever you tap, then goes back to looking around
  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    lookAt(e.clientX, e.clientY);
  });

  // called by script.js when a testimonial opens: start by glancing away, then turn to the cursor
  window.openPixelAvatar = function (name) {
    modalCanvas.dataset.pixelAvatar = name;
    look.x = -1;
    look.y = 0.2;
    drawn = '';
    render(modalCanvas, look.x, look.y, false);
  };

  const loop = function (now) {
    requestAnimationFrame(loop);
    if (!modalContainer.classList.contains('active') || document.hidden) return;

    // no recent cursor: slowly look around
    if (now - lastPointer > 2500) {
      look.tx = Math.sin(now / 1400) * 0.9;
      look.ty = Math.sin(now / 2300) * 0.3;
    }

    const ease = reduceMotion ? 1 : 0.12;
    look.x += (look.tx - look.x) * ease;
    look.y += (look.ty - look.y) * ease;

    if (!reduceMotion && now > nextBlink) {
      blinkUntil = now + 130;
      nextBlink = now + 2500 + Math.random() * 3000;
    }
    const blink = now < blinkUntil;

    // quantize so we only redraw when a pixel would actually change
    const qx = Math.round(look.x * 10) / 10;
    const qy = Math.round(look.y * 10) / 10;
    const key = qx + ',' + qy + ',' + blink + ',' + modalCanvas.dataset.pixelAvatar;
    if (key !== drawn) {
      drawn = key;
      render(modalCanvas, qx, qy, blink);
    }
  };

  requestAnimationFrame(loop);

})();
