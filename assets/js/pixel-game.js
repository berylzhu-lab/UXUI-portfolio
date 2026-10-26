'use strict';

/**
 * Pixel garden on the background (2 CSS px per art pixel, like the rest of the pixel art).
 * - Pale wild grass tufts dot the page and sway in a slow gust.
 * - Click empty background to plant a seed; it sprouts, buds and blooms.
 * - Butterflies wander, chase and circle the cursor while it moves, and visit blooming flowers.
 *   Landing picks up pollen; carrying it to a different flower pollinates that flower,
 *   which sparkles and drops a new seed nearby.
 * - window.pixelWorld.butterfly holds the first butterfly's screen position (the cat watches it).
 */

(function () {

  const container = document.querySelector('[data-bg-canvas]');
  if (!container) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const PX = 2;

  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-game';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;

  // size from the layer itself (excludes the scrollbar) and pin the CSS size to exactly
  // PX per art pixel, so pixels never get stretched to a fractional width
  const resize = function () {
    W = Math.ceil(container.clientWidth / PX);
    H = Math.ceil(container.clientHeight / PX);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = (W * PX) + 'px';
    canvas.style.height = (H * PX) + 'px';
  };
  window.addEventListener('resize', resize);
  resize();

  window.pixelWorld = window.pixelWorld || {};


  /* sprites: char grids -> offscreen canvases with a 1px outline */

  const OUTLINE = '#3b2340';

  const makeSprite = function (rows, palette) {
    const h = rows.length + 2;
    const w = Math.max.apply(null, rows.map(function (r) { return r.length; })) + 2;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const filled = function (x, y) {
      const r = rows[y - 1];
      return r && x >= 1 && r[x - 1] && r[x - 1] !== '.';
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (filled(x, y)) {
          g.fillStyle = palette[rows[y - 1][x - 1]];
          g.fillRect(x, y, 1, 1);
        } else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
          g.fillStyle = OUTLINE;
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    return c;
  };

  const WINGS_OPEN = [
    '....k...k....',
    '.....k.k.....',
    '.aaa..k..aaa.',
    'abbba.k.abbba',
    'abdbbakabbdba',
    'abbbbakabbbba',
    '.abbbakabbba.',
    '..aaakkkaaa..',
    '..abbakabba..',
    '.abdbakabdba.',
    '.abbba.abbba.',
    '..aaa...aaa..'
  ];

  const WINGS_UP = [
    '....k...k....',
    '.....k.k.....',
    '....aa.aa....',
    '...abakaba...',
    '...abdkdba...',
    '...abbkbba...',
    '....abkba....',
    '....aakaa....',
    '....abkba....',
    '....adkda....',
    '.....aka.....',
    '......k......'
  ];

  const BUTTERFLY_PALETTES = [
    { a: '#c46be8', b: '#f7bdf0', d: '#ffffff', k: '#3b2340' },
    { a: '#7f6cf0', b: '#cdc4ff', d: '#fff3a8', k: '#3b2340' },
    { a: '#ef7fa8', b: '#ffd0e0', d: '#fff6d8', k: '#3b2340' }
  ];

  const butterflySprites = BUTTERFLY_PALETTES.map(function (p) {
    return { open: makeSprite(WINGS_OPEN, p), up: makeSprite(WINGS_UP, p) };
  });

  // flower stages, bottom-aligned on a 9-wide grid; chunky like the butterflies:
  // 2px stem, leaves in blocks, full petals with a shaded side (q) and leaf shade (G)
  const STAGES = [
    [
      '...bb....',
      '.bbbbbbb.'
    ],
    [
      '.gg..gg..',
      '.gGssGg..',
      '...ss....',
      '...ss....',
      '.bbbbbbb.'
    ],
    [
      '...pp....',
      '..pppq...',
      '..pppq...',
      '...pq....',
      '...ss....',
      '.g.ss....',
      'ggGss.g..',
      '.ggssggg.',
      '...ssGg..',
      '...ss....',
      '.bbbbbbb.'
    ],
    [
      '..pp.pp..',
      '.ppppppp.',
      'pppyyyppp',
      'pppyyyppq',
      'pppyyypqq',
      '.pppppqq.',
      '..pp.qq..',
      '...ss....',
      '.g.ss....',
      'ggGss.g..',
      '.ggssggg.',
      '...ssGg..',
      '...ss....',
      '.bbbbbbb.'
    ]
  ];

  const FLOWER_PALETTES = [
    { p: '#ff9fd0', q: '#e978b4', y: '#ffd94a', g: '#7be0a0', G: '#4fae78', s: '#4fae78', b: '#8a5a3c' },
    { p: '#b98cff', q: '#9466e6', y: '#ffe27a', g: '#7be0a0', G: '#4fae78', s: '#4fae78', b: '#8a5a3c' },
    { p: '#ffb38a', q: '#f08f62', y: '#fff3a8', g: '#7be0a0', G: '#4fae78', s: '#4fae78', b: '#8a5a3c' }
  ];

  const flowerSprites = FLOWER_PALETTES.map(function (p) {
    return STAGES.map(function (rows) { return makeSprite(rows, p); });
  });

  const BLOOM = STAGES.length - 1;
  const STAGE_SECONDS = [0, 1.2, 2.6, 4.0];
  const LIFE = 45;
  const MAX_PLANTS = 18;


  /* wild grass: tufts with no outline, tinted per theme so they stay low-contrast on the page */

  const GRASS = [
    ['..g....', '..g..g.', 'g.gg.g.', '.gGg.gg', '.gGGgG.'],
    ['....g..', '.g..g..', '.g.gg.g', 'ggGg.gg', '.gGGGg.'],
    ['..w....', '..g..g.', '.ggg.g.', 'g.Gg.gG', '.gGGgg.'],      // with a tiny pale blossom
    ['.......', '...g...', '.g.g.g.', '.gGgGg.', '..GGG..'],
    ['.g...w.', '.g..gg.', 'gg.g.g.', '.gGgGg.', '.gGGGg.']
  ];
  const GRASS_COLORS = {
    light: { g: '#c3e3cd', G: '#a8d4b9', w: '#f5d7ee' },
    dark: { g: '#243a36', G: '#1c2e2c', w: '#3d2a4a' }       // muted night greens, barely above the background
  };

  // per theme, each tuft has a still frame and a "leaning" frame (top two rows nudged one pixel)
  const makeGrass = function (colors) { return GRASS.map(function (rows) {
    const draw = function (lean) {
      const c = document.createElement('canvas');
      c.width = rows[0].length + 1; c.height = rows.length;
      const g = c.getContext('2d');
      rows.forEach(function (row, y) {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '.') continue;
          g.fillStyle = colors[row[x]];
          g.fillRect(x + (lean && y < 2 ? 1 : 0), y, 1, 1);
        }
      });
      return c;
    };
    return [draw(false), draw(true)];
  }); };
  const grassSprites = { light: makeGrass(GRASS_COLORS.light), dark: makeGrass(GRASS_COLORS.dark) };

  // deterministic scatter so the meadow doesn't reshuffle on every visit
  const seeded = function (seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };

  let tufts = [];
  const scatterGrass = function () {
    const rand = seeded(20270420);
    const count = Math.round((W * H) / 1400);
    tufts = [];
    for (let i = 0; i < count; i++) {
      tufts.push({
        x: Math.floor(rand() * W),
        y: Math.floor(rand() * H),
        kind: Math.floor(rand() * GRASS.length)
      });
    }
  };
  scatterGrass();
  window.addEventListener('resize', scatterGrass);


  /* plants */

  const plants = [];

  const plant = function (x, y, now) {
    if (plants.length >= MAX_PLANTS) plants.shift();
    plants.push({
      // bottom-center of the sprite (art px), kept fully on screen so butterflies can reach it
      x: Math.round(Math.max(6, Math.min(W - 6, x))),
      y: Math.round(Math.max(18, Math.min(H - 2, y))),
      born: now,
      palette: Math.floor(Math.random() * FLOWER_PALETTES.length),
      pollinated: false
    });
  };

  const stageOf = function (p, now) {
    const age = (now - p.born) / 1000;
    let s = 0;
    for (let i = 0; i < STAGE_SECONDS.length; i++) if (age >= STAGE_SECONDS[i]) s = i;
    return s;
  };

  const isBlooming = function (p, now) {
    const age = (now - p.born) / 1000;
    return stageOf(p, now) === BLOOM && age < LIFE - 3;
  };

  // where a butterfly lands: the middle of the blossom
  const blossomOf = function (p) {
    const sprite = flowerSprites[p.palette][BLOOM];
    return { x: p.x, y: p.y - sprite.height + 4 };
  };

  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.sidebar, article, .navbar, a, button, input, textarea, .pdf-modal, .modal-container')) return;
    plant(e.clientX / PX, e.clientY / PX + 4, performance.now());
  });


  /* butterflies */

  const count = window.innerWidth < 768 ? 1 : 2;
  const butterflies = [];
  for (let i = 0; i < count; i++) {
    butterflies.push({
      x: W * (0.3 + 0.4 * i), y: H * 0.35,
      vx: 0, vy: 0,
      sprite: butterflySprites[i % butterflySprites.length],
      phase: Math.random() * 10,
      state: 'fly',
      target: null,
      flower: null,
      landedUntil: 0,
      wanderUntil: 0,
      carrying: null,        // the flower its pollen came from
      lastFlower: null
    });
  }

  let cursor = null;
  let lastMove = -Infinity;

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    cursor = { x: e.clientX / PX, y: e.clientY / PX };
    lastMove = performance.now();
  });

  const pickFlower = function (b, now) {
    const taken = butterflies.filter(function (o) { return o !== b && o.flower; }).map(function (o) { return o.flower; });
    const options = plants.filter(function (p) {
      return isBlooming(p, now) && p !== b.lastFlower && taken.indexOf(p) === -1;
    });
    if (!options.length) return null;
    return options[Math.floor(Math.random() * options.length)];
  };


  /* effects */

  const particles = [];

  const sparkle = function (x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, life: 0.7, max: 0.7, color: color, gravity: 10 });
    }
  };

  const pollinate = function (flower, now) {
    flower.pollinated = true;
    flower.born = now - STAGE_SECONDS[BLOOM] * 1000;   // a pollinated flower stays in bloom longer
    const c = blossomOf(flower);
    sparkle(c.x, c.y, '#ffe27a', 14, 26);
    sparkle(c.x, c.y, '#ffffff', 6, 18);
    // a new seed drops beside it
    const side = Math.random() < 0.5 ? -1 : 1;
    const nx = Math.max(6, Math.min(W - 6, flower.x + side * (10 + Math.random() * 14)));
    plant(nx, flower.y + Math.round(Math.random() * 4 - 2), now);
  };


  /* loop */

  let last = performance.now();
  let pollenTimer = 0;

  const tick = function (now) {
    requestAnimationFrame(tick);
    if (document.hidden) { last = now; return; }

    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;
    const cursorActive = cursor && now - lastMove < 2000;

    butterflies.forEach(function (b, i) {
      if (b.state === 'land') {
        // stay put on the flower, then take off with pollen
        if (now > b.landedUntil || !plants.includes(b.flower)) {
          b.state = 'fly';
          b.carrying = b.flower;
          b.lastFlower = b.flower;
          b.flower = null;
          b.target = null;
          b.vy = -20;
        }
      } else {
        // choose where to go: around the cursor, to a flower, or somewhere random
        if (cursorActive) {
          b.flower = null;
          const orbit = t * 1.6 + i * Math.PI;
          b.target = { x: cursor.x + Math.cos(orbit) * 14, y: cursor.y + Math.sin(orbit) * 9 - 6 };
        } else {
          if (b.flower && !isBlooming(b.flower, now)) b.flower = null;
          if (!b.flower) b.flower = pickFlower(b, now);
          if (b.flower) {
            b.target = blossomOf(b.flower);
          } else if (!b.target || now > b.wanderUntil) {
            b.target = { x: 20 + Math.random() * (W - 40), y: 20 + Math.random() * (H - 40) };
            b.wanderUntil = now + 4000 + Math.random() * 3000;
          }
        }

        const dx = b.target.x - b.x;
        const dy = b.target.y - b.y;
        const dist = Math.hypot(dx, dy);

        if (b.flower && dist < 2.5) {
          b.state = 'land';
          b.x = b.target.x; b.y = b.target.y;
          b.vx = 0; b.vy = 0;
          b.landedUntil = now + 2200 + Math.random() * 1200;
          const c = blossomOf(b.flower);
          if (b.carrying && b.carrying !== b.flower && plants.includes(b.carrying)) pollinate(b.flower, now);
          else sparkle(c.x, c.y, '#ffe27a', 6, 12);
        } else {
          if (!b.flower && !cursorActive && dist < 4) b.wanderUntil = 0;
          // steer toward the target with a gentle, slightly erratic flutter
          // chasing the cursor: fast when far, easing in as it arrives; otherwise a lazy drift
          const speed = cursorActive ? Math.max(30, Math.min(120, dist * 3)) : (b.flower ? 34 : 26);
          const grip = cursorActive ? 5 : 2.2;
          const ax = (dx / (dist || 1)) * speed - b.vx + Math.sin(t * 3 + b.phase) * 10;
          const ay = (dy / (dist || 1)) * speed - b.vy + Math.cos(t * 2.3 + b.phase) * 8;
          b.vx += ax * dt * grip;
          b.vy += ay * dt * grip;
          b.x = Math.max(4, Math.min(W - 4, b.x + b.vx * dt));
          b.y = Math.max(4, Math.min(H - 4, b.y + b.vy * dt));
        }
      }
    });

    // pollen trail from butterflies that carry pollen
    pollenTimer += dt;
    if (pollenTimer > 0.18) {
      pollenTimer = 0;
      butterflies.forEach(function (b) {
        if (b.carrying && b.state === 'fly') {
          particles.push({ x: b.x + (Math.random() * 4 - 2), y: b.y + 3, vx: 0, vy: 4, life: 0.9, max: 0.9, color: '#ffd94a', gravity: 0 });
        }
      });
    }

    window.pixelWorld.butterfly = butterflies.length
      ? { x: butterflies[0].x * PX, y: butterflies[0].y * PX }
      : null;


    /* draw */

    ctx.clearRect(0, 0, W, H);

    // a slow gust rolls across the meadow from left to right
    const meadow = grassSprites[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'];
    tufts.forEach(function (g) {
      const lean = Math.sin(t * 1.3 - g.x * 0.04) > 0.55 ? 1 : 0;
      ctx.drawImage(meadow[g.kind][lean], g.x, g.y);
    });

    for (let i = plants.length - 1; i >= 0; i--) {
      const p = plants[i];
      const age = (now - p.born) / 1000;
      if (age > LIFE) { plants.splice(i, 1); continue; }
      const sprite = flowerSprites[p.palette][stageOf(p, now)];
      ctx.globalAlpha = age > LIFE - 3 ? (LIFE - age) / 3 : 1;
      // blooming flowers sway by a pixel
      const sway = stageOf(p, now) === BLOOM && Math.floor(t * 1.5 + p.x) % 2 === 0 ? 1 : 0;
      ctx.drawImage(sprite, Math.round(p.x - sprite.width / 2) + sway, Math.round(p.y - sprite.height));
      if (p.pollinated && Math.floor(t * 4 + p.x) % 6 === 0) {
        const c = blossomOf(p);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(c.x) + 3, Math.round(c.y) - 4, 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.life -= dt;
      if (q.life <= 0) { particles.splice(i, 1); continue; }
      q.vy += q.gravity * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5);
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1);
    }
    ctx.globalAlpha = 1;

    butterflies.forEach(function (b) {
      // fast flaps in flight, slow ones while resting on a flower
      const rate = b.state === 'land' ? 1.4 : 9;
      const up = Math.floor(t * rate + b.phase) % 2 === 0;
      const sprite = up ? b.sprite.up : b.sprite.open;
      const bob = b.state === 'land' ? 0 : Math.round(Math.sin(t * 8 + b.phase) * 1.5);
      ctx.drawImage(sprite, Math.round(b.x - sprite.width / 2), Math.round(b.y - sprite.height / 2) + bob);
    });
  };

  requestAnimationFrame(tick);

})();
