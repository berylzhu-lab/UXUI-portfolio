'use strict';

/**
 * The pixel cat avatar on a canvas, so its eyes can move.
 * The pupils/irises look at the cursor while it moves, otherwise at the butterfly
 * (window.pixelWorld.butterfly, set by pixel-game.js). It also blinks now and then.
 * Two pixel grids are used (76px art on desktop, 38px below 1250px), each drawn at 2 CSS px per art pixel.
 */

(function () {

  const box = document.querySelector('.avatar-box');
  const fallback = box && box.querySelector('img.avatar-pixel');
  if (!box || !fallback) return;

  // eye geometry per grid, read off the art: interior pixel spans per row.
  // The source art draws the two irises differently (pupils toward the nose, highlights on
  // different sides), which reads as cross-eyed once they move. So on the big grid both eyes
  // reuse the left eye's 7x7 iris (`irisSprite`), centered in each eye (`center`) and moved together.
  // On the small grid the 1px pupils start at the same relative spot in both eyes (`base`).
  const GRIDS = {
    big: {
      size: 76,
      src: './assets/images/beryl-avatar-cat.png',
      blink: './assets/images/beryl-avatar-cat-blink.png',
      mode: 'iris',
      maxX: 1,
      maxY: 1,
      irisSprite: { x: 25, y: 32, size: 7, eye: 0 },
      eyes: [
        { rows: { 32: [26, 30], 33: [24, 30], 34: [23, 31], 35: [23, 31], 36: [23, 31], 37: [24, 31], 38: [25, 30] }, center: 27 },
        { rows: { 32: [46, 50], 33: [44, 51], 34: [44, 52], 35: [44, 52], 36: [44, 52], 37: [44, 51], 38: [44, 50] }, center: 48 }
      ]
    },
    small: {
      size: 38,
      src: './assets/images/beryl-avatar-cat-small.png',
      blink: './assets/images/beryl-avatar-cat-blink-small.png',
      mode: 'pupil',
      maxX: 1,
      maxY: 1,
      eyes: [
        { rows: { 16: [12, 15], 17: [12, 15], 18: [12, 15], 19: [12, 15] }, base: -1, range: [-2, 0] },
        { rows: { 16: [22, 25], 17: [22, 25], 18: [22, 25], 19: [22, 25] }, base: 0, range: [-1, 1] }
      ]
    }
  };

  const SCLERA = [244, 244, 250];
  const desktop = window.matchMedia('(min-width: 1250px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'avatar-pixel avatar-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', fallback.alt);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let grid = null;      // active GRIDS entry
  let open = null;      // ImageData of the open-eyed cat
  let closed = null;    // ImageData of the blink frame
  let drawnKey = '';

  const loadImage = function (src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  };

  const toData = function (img, n) {
    const c = document.createElement('canvas');
    c.width = n; c.height = n;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    return g.getImageData(0, 0, n, n);
  };

  const setup = function () {
    const next = desktop.matches ? GRIDS.big : GRIDS.small;
    return Promise.all([loadImage(next.src), loadImage(next.blink)]).then(function (imgs) {
      grid = next;
      open = toData(imgs[0], grid.size);
      closed = toData(imgs[1], grid.size);
      canvas.width = grid.size;
      canvas.height = grid.size;
      canvas.style.width = canvas.style.height = (grid.size * 2) + 'px';
      drawnKey = '';
      if (!canvas.isConnected) {
        fallback.closest('picture').replaceWith(canvas);
      }
    });
  };

  const inside = function (eye, x, y) {
    const span = eye.rows[y];
    return span && x >= span[0] && x <= span[1];
  };

  // draw the open-eyed cat with both irises (or pupils) looking in the gaze direction gx, gy
  const render = function (gx, gy) {
    const n = grid.size;
    const out = new ImageData(new Uint8ClampedArray(open.data), n, n);
    const src = open.data;
    const dst = out.data;
    const at = function (x, y) { return (y * n + x) * 4; };

    // the shared iris: pixels of the left eye's iris block that belong to the eye (not fur / outline)
    const sprite = grid.irisSprite;
    const irisPixel = function (sx, sy) {
      const x = sprite.x + sx;
      const y = sprite.y + sy;
      if (!inside(grid.eyes[sprite.eye], x, y)) return null;
      const j = at(x, y);
      const r = src[j], g = src[j + 1], b = src[j + 2];
      const white = r > 215 && g > 215 && b > 215;
      const blue = b > r + 40;
      const dark = r + g + b < 160;
      // keep iris colors and the highlight; anything else (lid shading, sclera at the edge) is skipped
      return blue || dark || (white && sx >= 2) ? [r, g, b] : null;
    };

    grid.eyes.forEach(function (eye) {
      if (grid.mode === 'iris') {
        // white eye, then the shared iris centered in it and shifted by the gaze
        Object.keys(eye.rows).forEach(function (yKey) {
          const y = Number(yKey);
          for (let x = eye.rows[y][0]; x <= eye.rows[y][1]; x++) {
            const i = at(x, y);
            dst[i] = SCLERA[0]; dst[i + 1] = SCLERA[1]; dst[i + 2] = SCLERA[2];
          }
        });
        const half = Math.floor(sprite.size / 2);
        for (let sy = 0; sy < sprite.size; sy++) {
          for (let sx = 0; sx < sprite.size; sx++) {
            const c = irisPixel(sx, sy);
            if (!c) continue;
            const x = eye.center - half + sx + gx;
            const y = sprite.y + sy + gy;
            if (!inside(eye, x, y)) continue;
            const i = at(x, y);
            dst[i] = c[0]; dst[i + 1] = c[1]; dst[i + 2] = c[2];
          }
        }
      } else {
        // both pupils start at the same relative spot and move together
        const dx = Math.max(eye.range[0], Math.min(eye.range[1], eye.base + gx));
        const dy = gy;
        // tiny eyes: just move the dark pupil pixels over the iris color
        const pupil = [];
        let iris = null;
        Object.keys(eye.rows).forEach(function (yKey) {
          const y = Number(yKey);
          for (let x = eye.rows[y][0]; x <= eye.rows[y][1]; x++) {
            const i = at(x, y);
            const sum = src[i] + src[i + 1] + src[i + 2];
            if (sum < 200) pupil.push([x, y]);
            else if (!iris && src[i + 2] > src[i] + 40) iris = [src[i], src[i + 1], src[i + 2]];
          }
        });
        iris = iris || [70, 110, 220];
        pupil.forEach(function (p) {
          const i = at(p[0], p[1]);
          dst[i] = iris[0]; dst[i + 1] = iris[1]; dst[i + 2] = iris[2];
        });
        pupil.forEach(function (p) {
          const x = p[0] + dx;
          const y = p[1] + dy;
          const ok = inside(eye, x, y);
          const i = at(ok ? x : p[0], ok ? y : p[1]);
          const j = at(p[0], p[1]);
          dst[i] = src[j]; dst[i + 1] = src[j + 1]; dst[i + 2] = src[j + 2];
        });
      }
    });

    ctx.putImageData(out, 0, 0);
  };


  /* gaze: cursor while it moves, otherwise the butterfly */

  let cursor = null;
  let lastMove = -Infinity;

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    cursor = { x: e.clientX, y: e.clientY };
    lastMove = performance.now();
  });

  // touch screens have no hover: a tap is the point of attention for a moment
  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    cursor = { x: e.clientX, y: e.clientY };
    lastMove = performance.now();
  });

  let nextBlink = performance.now() + 2500;
  let blinkUntil = 0;
  let doubleBlinkAt = 0;

  const tick = function (now) {
    requestAnimationFrame(tick);
    if (!grid || document.hidden) return;

    const world = window.pixelWorld;
    let target = null;
    if (cursor && now - lastMove < 2500) target = cursor;
    else if (world && world.butterfly) target = world.butterfly;

    let dx = 0;
    let dy = 0;
    if (target) {
      const r = canvas.getBoundingClientRect();
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height * 0.46;     // the eyes sit a little above center
      const vx = Math.max(-1, Math.min(1, (target.x - ex) / 140));
      const vy = Math.max(-1, Math.min(1, (target.y - ey) / 140));
      dx = Math.round(vx * grid.maxX);
      dy = Math.round(vy * grid.maxY);
    }

    if (!reduceMotion && now > nextBlink) {
      blinkUntil = now + 140;
      doubleBlinkAt = Math.random() < 0.3 ? now + 300 : 0;
      nextBlink = now + 3000 + Math.random() * 3500;
    }
    if (doubleBlinkAt && now > doubleBlinkAt) {
      blinkUntil = now + 120;
      doubleBlinkAt = 0;
    }
    const blink = now < blinkUntil;

    const key = blink ? 'blink' : dx + ',' + dy;
    if (key === drawnKey) return;
    drawnKey = key;
    if (blink) ctx.putImageData(closed, 0, 0);
    else render(dx, dy);
  };

  setup().then(function () { requestAnimationFrame(tick); }).catch(function () { /* keep the static image */ });
  desktop.addEventListener('change', function () { setup(); });

})();
