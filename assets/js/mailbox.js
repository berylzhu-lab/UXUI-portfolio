'use strict';

/**
 * Pixel mailbox on the Contact page.
 * Click it: the door drops open, a letter peeks out, the flag goes up and the message form
 * unfolds. Sending posts to Formspree in the background; on success the letter slides back
 * into the box, the door shuts and the flag stays up ("mail is in").
 */

(function () {

  const button = document.querySelector('[data-mailbox]');
  const canvas = document.querySelector('[data-mailbox-canvas]');
  const formSection = document.querySelector('[data-contact-form]');
  const form = document.querySelector('[data-form]');
  const statusEl = document.querySelector('[data-mailbox-status]');
  const hintEl = document.querySelector('[data-mailbox-hint]');
  if (!button || !canvas || !formSection || !form) return;

  const ctx = canvas.getContext('2d');
  // the scene is laid out on a 40x32 grid, then drawn at 2x so the outline is one fine pixel
  const S = 2;
  const BW = 40;
  const BH = 32;
  const W = canvas.width = BW * S;
  const H = canvas.height = BH * S;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const C = {
    outline: '#3b2340',
    body: '#9a5cf0', bodyShade: '#7a3fd6', bodyLight: '#c39bff',
    inside: '#2a1840',
    post: '#8a5a3c', postShade: '#6b4128',
    flag: '#ff6fae', flagShade: '#d94b8a', pole: '#5a4a5e',
    grass: '#7be0a0', grassShade: '#4fae78',
    paper: '#fff8ec', paperShade: '#e8d8c0', stamp: '#ff6fae'
  };

  const EN = {
    'contactPage.sending': 'Sending…',
    'contactPage.sent': "Delivered! I'll get back to you soon ✉",
    'contactPage.error': "That didn't send. Please try again, or email me directly."
  };

  const t = function (key) {
    const isZh = document.documentElement.lang.indexOf('zh') === 0;
    if (isZh && typeof zh !== 'undefined' && zh[key]) return zh[key];
    return EN[key];
  };


  /* drawing: build a color grid, then add a 1px outline like the other pixel sprites */

  // state: door 0 = shut, 0.5 = swinging, 1 = open; letter = how far it sticks out (0..8, -1 hidden); flag 0 = down, 1 = up
  const state = { door: 0, letter: -1, flag: 0 };

  const draw = function () {
    const grid = [];
    for (let y = 0; y < BH; y++) grid.push(new Array(BW).fill(null));
    const set = function (x, y, c) { if (x >= 0 && x < BW && y >= 0 && y < BH) grid[y][x] = c; };
    const rect = function (x0, y0, x1, y1, c) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
    };

    // ground + grass tufts
    rect(5, 29, 34, 31, C.grassShade);
    rect(6, 28, 33, 28, C.grass);
    [7, 11, 26, 31].forEach(function (x) { set(x, 27, C.grass); set(x + 1, 26, C.grass); });

    // post
    rect(18, 18, 21, 28, C.post);
    rect(21, 18, 21, 28, C.postShade);

    // flag (behind the body when down, sticking up when raised)
    if (state.flag) {
      rect(30, 1, 30, 12, C.pole);
      rect(31, 1, 36, 4, C.flag);
      rect(31, 4, 36, 4, C.flagShade);
    } else {
      rect(26, 12, 35, 13, C.flag);
      rect(26, 13, 35, 13, C.flagShade);
    }

    // body: long box with a rounded top
    rect(13, 6, 28, 6, C.body);
    rect(11, 7, 30, 7, C.body);
    rect(10, 8, 31, 17, C.body);
    rect(13, 7, 27, 8, C.bodyLight);
    rect(10, 17, 31, 17, C.bodyShade);
    rect(31, 8, 31, 17, C.bodyShade);

    // the flag pivot sits on top of the body
    set(30, 12, C.pole);

    // letter (drawn before the door so a shut door hides it)
    if (state.letter >= 0) {
      const lx = 10 - state.letter;
      rect(lx, 10, lx + 8, 15, C.paper);
      rect(lx, 15, lx + 8, 15, C.paperShade);
      // envelope flap "V"
      set(lx + 1, 11, C.paperShade); set(lx + 2, 12, C.paperShade); set(lx + 3, 13, C.paperShade);
      set(lx + 4, 13, C.paperShade); set(lx + 5, 12, C.paperShade); set(lx + 6, 11, C.paperShade);
      set(lx + 7, 10, C.stamp); set(lx + 8, 10, C.stamp); set(lx + 7, 11, C.stamp); set(lx + 8, 11, C.stamp);
    }

    // front door
    if (state.door === 0) {
      rect(8, 8, 10, 17, C.body);
      rect(9, 7, 10, 7, C.body);
      rect(8, 8, 8, 17, C.bodyLight);
      set(7, 12, C.bodyShade); set(7, 13, C.bodyShade);           // handle
    } else {
      // dark opening (letter, if any, is drawn over it)
      for (let y = 8; y <= 16; y++) for (let x = 9; x <= 10; x++) if (!grid[y][x] || grid[y][x] === C.body || grid[y][x] === C.bodyLight) set(x, y, C.inside);
      if (state.letter >= 0) {
        const lx = 10 - state.letter;
        for (let y = 10; y <= 15; y++) for (let x = Math.max(lx, 9); x <= 10 && x <= lx + 8; x++) set(x, y, y === 15 ? C.paperShade : C.paper);
      }
      if (state.door < 1) {
        // swinging: a diagonal slab from the hinge
        for (let i = 0; i < 7; i++) { set(9 - i, 17 - i, C.body); set(10 - i, 17 - i, C.body); set(9 - i, 16 - i, C.bodyLight); }
      } else {
        // dropped flat, hanging from the hinge
        rect(0, 18, 10, 19, C.body);
        rect(0, 19, 10, 19, C.bodyShade);
        set(1, 20, C.bodyShade); set(2, 20, C.bodyShade);           // handle underneath
      }
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


  /* tiny timeline helper: run steps in order, each after a delay */

  let timers = [];
  const play = function (steps) {
    timers.forEach(clearTimeout);
    timers = [];
    let at = 0;
    steps.forEach(function (step) {
      at += reduceMotion ? 0 : step[0];
      timers.push(setTimeout(function () { step[1](); draw(); }, at));
    });
  };

  const letterOut = function () {
    const steps = [];
    for (let i = 0; i <= 7; i++) steps.push([45, function () { state.letter = i; }]);
    return steps;
  };

  const letterIn = function () {
    const steps = [];
    for (let i = 7; i >= 0; i--) steps.push([45, function () { state.letter = i; }]);
    steps.push([45, function () { state.letter = -1; }]);
    return steps;
  };

  let open = false;

  const setStatus = function (key) {
    statusEl.textContent = key ? t(key) : '';
  };

  const openBox = function () {
    open = true;
    button.setAttribute('aria-expanded', 'true');
    button.classList.add('is-open');
    hintEl.classList.add('is-hidden');
    setStatus('');
    formSection.classList.add('open');
    play([[0, function () { state.door = 0.5; }], [90, function () { state.door = 1; state.letter = 0; }]]
      .concat(letterOut())
      .concat([[120, function () { state.flag = 1; }]]));
    setTimeout(function () { form.querySelector('input').focus({ preventScroll: true }); }, 350);
  };

  const closeBox = function (sent) {
    open = false;
    button.setAttribute('aria-expanded', 'false');
    button.classList.remove('is-open');
    formSection.classList.remove('open');
    if (!sent) hintEl.classList.remove('is-hidden');
    play(letterIn().concat([
      [60, function () { state.door = 0.5; }],
      [90, function () { state.door = 0; if (!sent) state.flag = 0; }]
    ]));
  };

  button.addEventListener('click', function () {
    if (open) closeBox(false);
    else openBox();
  });


  /* send in the background so the visitor stays on the page */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const submitBtn = form.querySelector('[data-form-btn]');
    submitBtn.setAttribute('disabled', '');
    setStatus('contactPage.sending');

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    }).then(function (res) {
      if (!res.ok) throw new Error('send failed');
      form.reset();
      closeBox(true);
      setStatus('contactPage.sent');
      button.classList.add('is-delivered');
      setTimeout(function () { button.classList.remove('is-delivered'); }, 900);
    }).catch(function () {
      setStatus('contactPage.error');
      if (form.checkValidity()) submitBtn.removeAttribute('disabled');
    });
  });

  draw();

})();
