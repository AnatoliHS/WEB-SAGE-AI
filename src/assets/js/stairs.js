// Stairs (trial, concepts/stairs.njk): a sage sprig grows out of each point of the staircase
// (section 01, .grow-step's dot) as it comes into view, and then something carries the eye on into
// the next section as you scroll. Picked by html[data-stairs] (head.njk: ?stairs=<name>):
//   swoop   leaves lift off the sprigs and swoop down on long curving flights, trailing a fine line
//           of air and casting a soft shadow, to settle along the next heading
//   roots   tapered roots grow down from under the steps, forking finer, tips glowing, and once
//           grown, light runs down them to the tips
// On phones, where the steps stack, the sprigs grow out sideways along each step's top as dividers,
// and only the last step grows roots.
//   sprigs  the sprigs alone
//   sprout  the dot-matrix hero's language instead (the homepage's, index.html; compared in
//           concepts/stairs-dots.njk): a small sprig of dots builds itself up from each point, stem
//           first and then its leaves, dot by dot, taller at each step
// Drawn on one canvas over the page, only while the staircase or the way down is on screen.
(() => {
  const root = document.documentElement;
  const variant = root.dataset.stairs;
  const stairs = document.querySelector('.grow-stairs');
  if (variant === 'sprout' && stairs) return sprout();
  const next = document.querySelector('.section-wrestle');
  if (!variant || !stairs || !next || !window.SageLeaf) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = Array.from(stairs.querySelectorAll('.grow-step'));
  const pathEl = stairs.querySelector('.grow-path');
  const head = next.querySelector('.section-head') || next;
  const band = next.querySelector('[data-untangle]');

  const canvas = document.createElement('canvas');
  canvas.className = 'st-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const g = canvas.getContext('2d');
  // The canvas lies on the page over the staircase and the way down to section 02, so it scrolls
  // with them natively (a fixed canvas redrawn each frame lags the scroll on phones, and the plants
  // slide about). It's drawn in screen coordinates all the same: each frame maps them onto it.
  // W: the page's width; H: the screen's height (only for how far things have got)
  let W = 0, H = 0, dpr = 1, box = '';
  const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
  const size = () => {
    H = window.innerHeight;
    const w = document.documentElement.clientWidth;
    const top = Math.round(docTop(stairs) - 360);
    const bottom = Math.round(docTop(next.querySelector('.section-head') || next) + 220);
    dpr = Math.min(window.devicePixelRatio || 1, w < 761 ? 2 : 1.5);
    // Only when the region itself changes (a phone's toolbar showing or hiding changes H alone)
    const key = `${w}:${top}:${bottom}:${dpr}`;
    if (key === box) return;
    box = key;
    W = w;
    Object.assign(canvas.style, { top: `${top}px`, height: `${bottom - top}px`, width: `${w}px` });
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round((bottom - top) * dpr);
  };
  size();
  window.addEventListener('resize', size);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  // And again if anything above it changes height (images arriving, say)
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(document.body);
  // Screen coordinates onto the canvas, wherever it is now
  const place = () => {
    const r = canvas.getBoundingClientRect();
    g.setTransform(dpr, 0, 0, dpr, -r.left * dpr, -r.top * dpr);
  };
  const wipe = () => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
  };

  let seed = 9;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const range = (a, b) => a + rnd() * (b - a);
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  const inkRGB = (() => {
    const p = document.createElement('i');
    p.style.color = 'var(--ink)';
    document.body.append(p);
    const c = getComputedStyle(p).color.match(/[\d.]+/g).slice(0, 3).join(', ');
    p.remove();
    return c;
  })();
  const leaves = SageLeaf.make(8, SageLeaf.tones());
  const STEM = 'rgba(78, 52, 108, 0.95)';

  // ---- Sprigs, one per point --------------------------------------------------------------------
  const sprigs = steps.map((_, i) => ({
    start: 0,
    len: range(0.85, 1.15) * (i === 2 ? 1.15 : 1),
    // All leaning to the right, each a little differently
    bend: range(0.3, 0.5),
    ph: rnd() * 6.28,
    pairs: [0.2, 0.36, 0.51, 0.64, 0.76, 0.87].map((u) => ({ u, img: leaves[Math.floor(rnd() * leaves.length)], spread: range(0.75, 1.05) })),
  }));

  // Where a sprig's stem is at u (0 at the point, 1 at the tip), and which way it's heading
  function stemAt(sp, x, y, L, u, sway) {
    const px = x + sp.bend * L * u * u * 0.6 + sway * u * u;
    const py = y - L * u;
    const dx = sp.bend * L * u * 1.2 + sway * 2 * u, dy = -L;
    return [px, py, Math.atan2(dy, dx)];
  }

  function drawLeaf(img, x, y, ang, size, open, flat = 1) {
    if (open <= 0) return;
    const w = SageLeaf.W * size * open, h = SageLeaf.H * size * open * flat;
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.drawImage(img, 0, -h / 2, w, h);
    g.restore();
  }

  // Upright from the point, or (phones) lying along the line to the right of it, as a divider
  // reaching across to the margin
  function drawSprig(sp, x, y, k, t, scale, across = 0) {
    if (k <= 0) return;
    if (across) {
      g.save();
      g.translate(x, y);
      g.rotate(Math.PI / 2);
      const bend = sp.bend;
      sp.bend = bend * 0.15;
      drawSprigUp(sp, 0, 0, k, t, scale, across);
      sp.bend = bend;
      g.restore();
      return;
    }
    drawSprigUp(sp, x, y, k, t, scale);
  }

  function drawSprigUp(sp, x, y, k, t, scale, length) {
    const L = length || 128 * scale * sp.len;
    const sway = Math.sin(t * 1.1 + sp.ph) * (length ? 2 : 5) * k;
    g.strokeStyle = STEM;
    g.lineWidth = 2.2 * scale;
    g.lineCap = 'round';
    g.beginPath();
    for (let j = 0; j <= 24; j++) {
      const [px, py] = stemAt(sp, x, y, L, (j / 24) * k, sway);
      if (j) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.stroke();
    // Leaves in opposite pairs, each pair a quarter turn on from the last (sage is decussate)
    if (length) {
      // A divider: pairs close along the stem, swept back towards its tip like a garland, a little
      // smaller towards the end, alternately turned (the far one of each pair foreshortened)
      const n = Math.max(6, Math.floor(L / 23));
      for (let j = 0; j < n; j++) {
        const u = 0.06 + (j / n) * 0.9;
        const open = ease(clamp01((k - u) / 0.12));
        const [px, py, a] = stemAt(sp, x, y, L, u, sway);
        const pr = sp.pairs[j % sp.pairs.length];
        const size = (0.8 - u * 0.35) * (j % 2 ? 0.9 : 1);
        const img = j % 3 === 2 ? pr.img.under : pr.img.top;
        drawLeaf(img, px, py, a - 0.85, size, open, j % 2 ? 0.75 : 1);
        drawLeaf(pr.img.top, px, py, a + 0.85, size, open, j % 2 ? 1 : 0.75);
      }
    } else {
      sp.pairs.forEach((pr, j) => {
        const open = ease(clamp01((k - pr.u) / 0.16));
        const [px, py, a] = stemAt(sp, x, y, L, pr.u, sway);
        const size = (1.05 - pr.u * 0.7) * scale * 0.72;
        const flat = j % 2 ? 0.55 : 1;
        drawLeaf(pr.img.top, px, py, a - pr.spread, size, open, flat);
        drawLeaf(pr.img.top, px, py, a + pr.spread, size, open, flat);
      });
    }
    // The bud at the tip
    if (k > 0.9) {
      const [px, py, a] = stemAt(sp, x, y, L, k, sway);
      const o = ease(clamp01((k - 0.9) / 0.1));
      drawLeaf(sp.pairs[0].img.top, px, py, a - 0.3, 0.3 * scale, o);
      drawLeaf(sp.pairs[1].img.top, px, py, a + 0.3, 0.3 * scale, o);
    }
  }

  // The points, on screen, now
  const points = () => steps.map((li) => {
    const r = li.getBoundingClientRect();
    return [r.left + 4.5, r.top + 0.5];
  });

  // ---- The way down: shared helpers ---------------------------------------------------------------
  // A smooth path through points (Catmull-Rom), as a dense polyline with its running length
  function spline(pts, n = 18) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    out.push(pts[pts.length - 1]);
    let len = 0;
    const acc = out.map((p, i) => (len += i ? Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]) : 0));
    return { pts: out, acc, len };
  }

  // Stroke a path up to a share of its length; returns the point it got to and its heading
  function strokeTo(path, k, wobble = 0) {
    const stop = path.len * k;
    let last = path.pts[0], ang = 0;
    g.beginPath();
    for (let i = 0; i < path.pts.length; i++) {
      let [x, y] = path.pts[i];
      if (wobble) { x += Math.sin(i * 0.9) * wobble + Math.sin(i * 2.3) * wobble * 0.5; }
      if (path.acc[i] > stop) {
        const prev = path.pts[i - 1];
        const f = (stop - path.acc[i - 1]) / (path.acc[i] - path.acc[i - 1] || 1);
        x = prev[0] + (x - prev[0]) * f;
        y = prev[1] + (y - prev[1]) * f;
        g.lineTo(x, y);
        ang = Math.atan2(y - last[1], x - last[0]);
        last = [x, y];
        break;
      }
      if (i) { g.lineTo(x, y); ang = Math.atan2(y - last[1], x - last[0]); } else g.moveTo(x, y);
      last = [x, y];
    }
    g.stroke();
    return [last[0], last[1], ang];
  }

  // Where the way down starts (the end of the staircase line) and ends (the next heading), on screen
  function ends() {
    const pr = pathEl ? pathEl.getBoundingClientRect() : null;
    const pts = points();
    const S = pr && pr.width ? [pr.right, pr.bottom] : [pts[2][0], pts[2][1] + 160];
    const hr = head.getBoundingClientRect();
    const E = [hr.left + 4, hr.top - 26];
    // Below the last step's copy, and the right-hand margin, to keep clear of the text
    const B = stairs.getBoundingClientRect().bottom + 30;
    const R = Math.min(W - 18, S[0] + 14);
    return { S, E, B, R, pts, hr };
  }
  // How far down the way it has got: the head keeps just ahead of 70% down the screen
  const along = (S, E) => clamp01((H * 0.72 - S[1]) / Math.max(1, E[1] - S[1]));

  // ---- The five ways down ---------------------------------------------------------------------------
  seed = 41;
  // Eases a value towards a target, frame-rate independent, so scroll-driven motion glides
  const follow = (cur, target, dt, rate = 0.04) => cur + (target - cur) * (1 - Math.pow(rate, dt));

  // ---- Swooping leaves ----------------------------------------------------------------------------
  // Hero leaves, large and sharp, and a few far ones, small, soft and faint, for depth. Each lifts
  // off its sprig, swings out to the margin, sweeps across the open space in a long S and settles
  // in a loose arc along the next heading, rocking gently once it's down
  const flights = [
    ...Array.from({ length: 8 }, (_, i) => ({ far: false, from: i % 3, lead: i * 0.055, size: range(1.05, 1.6), sx: range(-0.1, 0.12), m: range(10, 70), turns: range(1.4, 2.6), ph: rnd() * 6.28, fr: range(2.2, 3.4), slot: i / 7 })),
    ...Array.from({ length: 5 }, (_, i) => ({ far: true, from: i % 3, lead: 0.08 + i * 0.07, size: range(0.45, 0.65), sx: range(-0.25, 0.2), m: range(80, 200), turns: range(1, 2), ph: rnd() * 6.28, fr: range(1.6, 2.4), slot: range(0, 1) })),
  ].map((f, i) => ({ ...f, img: leaves[i % leaves.length], k: 0 }));

  function swoop(t, dt, { E, B, R, pts, hr }) {
    const go = clamp01((H * 0.78 - pts[0][1]) / Math.max(1, E[1] - pts[0][1]));
    const span = Math.min(W * 0.55, 640);
    // Far ones first, so the near ones pass over them
    flights.forEach((f) => {
      f.k = reduced ? clamp01(go * 1.3 - f.lead) : follow(f.k, clamp01((go * 1.3 - f.lead) / 0.85), dt, 0.02);
      const k = f.k;
      if (k <= 0.001) return;
      const sp = sprigs[f.from];
      const from = pts[f.from];
      const top = [from[0] + sp.bend * 30, from[1] - 128 * sp.len * 0.72];
      const end = f.far
        ? [hr.left + span * f.slot, hr.top - 80 - f.slot * 40]
        : [hr.left + 18 + span * f.slot, hr.top - 34 - Math.sin(f.slot * Math.PI) * 26];
      const D = end[1] - B;
      const path = spline([
        top,
        [top[0] + 40, top[1] - 50],
        [R - f.m, B + D * 0.12],
        [W * (0.42 + f.sx), B + D * 0.55],
        [end[0] + 140, end[1] - 110],
        end,
      ], 22);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const at = (d) => {
        let i = path.acc.findIndex((a) => a >= d);
        if (i < 1) i = d <= 0 ? 1 : path.pts.length - 1;
        const a = path.pts[i - 1], b = path.pts[i];
        const u = clamp01((d - path.acc[i - 1]) / (path.acc[i] - path.acc[i - 1] || 1));
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])];
      };
      const dist = path.len * e;
      const [x, y, heading] = at(dist);
      const landed = clamp01((k - 0.82) / 0.18);
      const air = 1 - landed;

      // The air it leaves behind: a fine, fading line along the way it came
      if (!f.far && air > 0.05) {
        const tail = Math.min(dist, 220);
        for (let j = 0; j < 14; j++) {
          const [ax, ay] = at(dist - tail * (j / 14));
          const [bx, by] = at(dist - tail * ((j + 1) / 14));
          g.strokeStyle = `rgba(151, 26, 255, ${0.22 * (1 - j / 14) * air})`;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(bx, by);
          g.stroke();
        }
      }

      // Its shadow on the page: further off and softer the higher it is
      const lift = f.far ? 0 : 6 + 26 * air;
      const sr = SageLeaf.W * f.size * 0.55;
      g.save();
      g.translate(x + lift * 0.6, y + lift);
      g.rotate(heading);
      g.scale(1, 0.32);
      const sh = g.createRadialGradient(0, 0, 0, 0, 0, sr * (1 + air * 0.6));
      sh.addColorStop(0, `rgba(40, 20, 70, ${f.far ? 0 : 0.16 - 0.08 * air})`);
      sh.addColorStop(1, 'rgba(40, 20, 70, 0)');
      g.fillStyle = sh;
      g.fillRect(-sr * 2, -sr * 2, sr * 4, sr * 4);
      g.restore();

      // The leaf: along its flight, fluttering, turning over and back, settling top-up and rocking
      const flutter = Math.sin(t * f.fr + f.ph) * 0.55 * air;
      const rest = landed * (Math.sin(t * 1.3 + f.ph) * 0.06 - 0.35 + f.slot * 0.7);
      const ang = heading * air + flutter + rest;
      const turn = Math.cos(e * f.turns * Math.PI * 2 + f.ph);
      const flip = turn + (1 - turn) * smoothstep(landed);
      const img = flip < 0 ? f.img.under : f.far ? f.img.soft : f.img.top;
      g.globalAlpha = f.far ? 0.45 : 1;
      g.save();
      g.translate(x, y);
      g.rotate(ang);
      const w = SageLeaf.W * f.size, h = SageLeaf.H * f.size * Math.max(0.12, Math.abs(flip));
      g.drawImage(img, -w * 0.5, -h / 2, w, h);
      g.restore();
      g.globalAlpha = 1;
    });
  }
  const smoothstep = (k) => k * k * (3 - 2 * k);

  // ---- Roots --------------------------------------------------------------------------------------
  // Grown once per step: tapered roots that bend as they go and pull downwards, forking finer, each
  // starting to grow once its parent has reached where it forks. Drawn as filled, tapered strokes in
  // deep plum fading with depth; growing tips glow violet; fine hairs along the older roots; and once
  // grown, light keeps travelling down them, from the step to the tips
  const trees = [];
  // minX, maxX: how far it may spread left and right of where it starts (the page's edges)
  function growTree(D, sc, minX = -Infinity, maxX = Infinity) {
    const roots = [];
    const branch = (x, y, a, len, w, depth, startAt, parent, forkAt) => {
      const pts = [[x, y]];
      const n = Math.max(3, Math.round(len / 5));
      let ang = a;
      for (let i = 0; i < n; i++) {
        ang += (rnd() - 0.5) * 0.22 + (Math.PI / 2 - ang) * 0.035;
        // Turned back down before it reaches the edge of the page
        if (x < minX + 60 && Math.cos(ang) < 0) ang += (Math.PI * 0.42 - ang) * 0.25;
        if (x > maxX - 60 && Math.cos(ang) > 0) ang += (Math.PI * 0.58 - ang) * 0.25;
        x += Math.cos(ang) * 5;
        y += Math.sin(ang) * 5;
        pts.push([x, y]);
      }
      const r = { pts, w, depth, start: startAt, parent, forkAt, len: n * 5, kids: [] };
      roots.push(r);
      if (depth >= 4) return r;
      for (let i = 6; i < n - 4; i += Math.round(range(5, 11))) {
        if (rnd() > 0.55 - depth * 0.08) continue;
        const side = rnd() < 0.5 ? -1 : 1;
        const p = pts[i];
        const pa = Math.atan2(pts[i + 1][1] - p[1], pts[i + 1][0] - p[0]);
        const kid = branch(p[0], p[1], pa + side * range(0.5, 1.05), (n - i) * 5 * range(0.35, 0.7), w * (1 - i / n) * 0.62, depth + 1, startAt + i * 5, r, i);
        r.kids.push(kid);
      }
      return r;
    };
    (W < 761 ? [-0.9, -0.4, 0, 0.45, 0.9] : [-0.55, 0, 0.5]).forEach((spread, i, all) => branch((i - (all.length - 1) / 2) * 5, 0, Math.PI / 2 + spread + range(-0.15, 0.15), D * (spread === 0 ? 0.92 : range(0.55, 0.75)), (spread === 0 ? 3.2 : 2.2) * sc, 0, 0, null, 0));
    const max = Math.max(...roots.map((r) => r.start + r.len));
    return { roots, max, g: 0, pulses: [], next: 0 };
  }

  // A root's path from the step down to it, root first
  function lineage(r) {
    const chain = [];
    for (let c = r, cut = Infinity; c; cut = c.forkAt, c = c.parent) chain.unshift(c.pts.slice(0, Math.min(c.pts.length, cut + 1)));
    return chain.flat();
  }

  function roots(t, dt, { E, pts }) {
    const sc = Math.min(Math.max(W / 1440, 0.75), 1.2);
    if (!trees.length) {
      seed = 77;
      // Phones: only from the last step, the others' sprigs being dividers
      (W < 761 ? steps.slice(-1) : steps).forEach((li) => {
        const r = li.getBoundingClientRect();
        // Phones: from the middle of the screen, so they spread both ways under the last step
        const dx = W < 761 ? W / 2 - r.left : range(14, 40);
        const x0 = r.left + dx;
        trees.push({ li, dx, ...growTree(Math.max(180, E[1] - r.bottom - 60), sc, 16 - x0, W - 16 - x0) });
      });
    }
    trees.forEach((tr) => {
      const r = tr.li.getBoundingClientRect();
      const x0 = r.left + tr.dx, y0 = r.bottom + 14;
      const go = clamp01((H * 0.86 - y0) / (H * 0.62));
      tr.g = reduced ? go * tr.max : follow(tr.g, go * tr.max, dt, 0.03);
      if (tr.g <= 1) return;
      const fill = g.createLinearGradient(0, y0, 0, y0 + tr.max * 0.9);
      fill.addColorStop(0, 'rgba(58, 34, 86, 0.92)');
      fill.addColorStop(1, 'rgba(58, 34, 86, 0.28)');

      // The seed point, where the roots leave the step
      g.fillStyle = 'rgba(58, 34, 86, 0.9)';
      g.beginPath();
      g.arc(x0, y0, 2.6 * sc, 0, Math.PI * 2);
      g.fill();

      const tips = [];
      tr.roots.forEach((rt) => {
        const grown = tr.g - rt.start;
        if (grown <= 0) return;
        const n = Math.min(rt.pts.length - 1, grown / 5);
        const whole = Math.floor(n), part = n - whole;
        const pl = rt.pts.slice(0, whole + 1).map(([x, y]) => [x0 + x, y0 + y]);
        if (whole < rt.pts.length - 1) {
          const a = rt.pts[whole], b = rt.pts[whole + 1];
          pl.push([x0 + a[0] + (b[0] - a[0]) * part, y0 + a[1] + (b[1] - a[1]) * part]);
        }
        if (pl.length < 2) return;
        // A tapered body: its width along it, narrowing to a point at the (growing) tip
        const full = rt.pts.length - 1;
        const widthAt = (i) => rt.w * (1 - (i / full) * 0.75) * Math.min(1, (pl.length - 1 - i) / 5 + 0.15);
        const left = [], right = [];
        pl.forEach((p, i) => {
          const q = pl[Math.min(i + 1, pl.length - 1)], o = pl[Math.max(i - 1, 0)];
          const a = Math.atan2(q[1] - o[1], q[0] - o[0]) + Math.PI / 2;
          const w = widthAt(i) / 2;
          left.push([p[0] + Math.cos(a) * w, p[1] + Math.sin(a) * w]);
          right.push([p[0] - Math.cos(a) * w, p[1] - Math.sin(a) * w]);
        });
        g.fillStyle = fill;
        g.beginPath();
        left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        right.reverse().forEach(([x, y]) => g.lineTo(x, y));
        g.closePath();
        g.fill();
        // Root hairs, fine and short, along the older part of each fine root
        if (rt.depth >= 2) {
          g.strokeStyle = 'rgba(58, 34, 86, 0.22)';
          g.lineWidth = 0.6;
          g.beginPath();
          for (let i = 3; i < pl.length - 6; i += 3) {
            const [px, py] = pl[i];
            const h = 4 + ((i * 7) % 5);
            const s = i % 2 ? 1 : -1;
            g.moveTo(px, py);
            g.lineTo(px + s * h, py + h * 0.6);
          }
          g.stroke();
        }
        if (grown < rt.len) tips.push(pl[pl.length - 1]);
      });

      // Growing tips: a soft violet glow, and a bright point
      g.save();
      g.globalCompositeOperation = 'lighter';
      tips.forEach(([x, y]) => {
        const d = g.createRadialGradient(x, y, 0, x, y, 14);
        d.addColorStop(0, 'rgba(151, 26, 255, 0.55)');
        d.addColorStop(1, 'rgba(151, 26, 255, 0)');
        g.fillStyle = d;
        g.fillRect(x - 14, y - 14, 28, 28);
      });
      g.restore();
      g.fillStyle = '#b48cff';
      tips.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); });

      // Once grown, light runs down them, from the step out to the tips
      if (!reduced && tr.g > tr.max * 0.97) {
        if (t > tr.next) {
          const leaves = tr.roots.filter((rt) => !rt.kids.length);
          const end = leaves[Math.floor(Math.random() * leaves.length)];
          const line = lineage(end);
          let acc = 0;
          const lens = line.map((p, i) => (acc += i ? Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1]) : 0));
          tr.pulses.push({ line, lens, total: acc, born: t });
          tr.next = t + range(0.5, 1.1);
        }
        g.save();
        g.globalCompositeOperation = 'lighter';
        tr.pulses = tr.pulses.filter((p) => {
          const d = (t - p.born) * 170;
          if (d > p.total + 30) return false;
          const i = Math.max(1, p.lens.findIndex((l) => l >= d));
          const [px, py] = p.line[Math.min(i, p.line.length - 1)];
          const x = x0 + px, y = y0 + py;
          const fade = Math.min(1, (p.total + 30 - d) / 60);
          const glow = g.createRadialGradient(x, y, 0, x, y, 10);
          glow.addColorStop(0, `rgba(220, 200, 255, ${0.95 * fade})`);
          glow.addColorStop(0.35, `rgba(151, 26, 255, ${0.5 * fade})`);
          glow.addColorStop(1, 'rgba(151, 26, 255, 0)');
          g.fillStyle = glow;
          g.fillRect(x - 10, y - 10, 20, 20);
          return true;
        });
        g.restore();
      }
    });
  }

  const WAYS = { swoop, roots };

  // ---- Frame --------------------------------------------------------------------------------------
  let start = performance.now(), last = start, cleared = false;
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const sr = stairs.getBoundingClientRect(), nr = next.getBoundingClientRect();
    const active = sr.top < H * 1.1 && nr.top + 600 > 0;
    if (!active) {
      if (!cleared) { wipe(); cleared = true; }
      last = now;
      return;
    }
    cleared = false;
    const t = (now - start) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    wipe();
    place();
    const geo = ends();
    // Each sprig sets off as its point comes 80% of the way up the screen, a beat after the last
    const scale = Math.min(Math.max(W / 1440, 0.7), 1.2);
    const phone = W < 761;
    geo.pts.forEach(([x, y], i) => {
      const sp = sprigs[i];
      if (!sp.start && y < H * 0.82) sp.start = Math.max(now, i ? (sprigs[i - 1].start || now) + 350 : now);
      const k = reduced ? (sp.start ? 1 : 0) : sp.start ? clamp01((now - sp.start) / 1900) : 0;
      // The swooping leaves come off the sprigs, so those keep growing behind them
      drawSprig(sp, x, y, ease(k), t, phone ? 1.1 : scale, phone ? Math.min(W - x - 18, W * 0.5) : 0);
    });
    WAYS[variant] && WAYS[variant](t, dt, geo);
  }
  requestAnimationFrame(frame);

  // sprout: one canvas inside the staircase, reaching up above it for the sprigs. Each grows once,
  // when the staircase's top is 30% up the screen; with reduced motion they're simply there
  function sprout() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The sprig, read bottom up: | the stem, L a leaf
    const SPRIG = [
      '....L....',
      '...LLL...',
      '...L|L...',
      'L...|...L',
      'LL..|..LL',
      '.LL.|.LL.',
      '..LL|LL..',
      '....|....',
      '.L..|..L.',
      'LLL.|.LLL',
      '.LLL|LLL.',
      '...L|L...',
      '....|....',
      '....|....',
    ];
    const FROM = [48, 42, 255], TO = [151, 26, 255], STEM = [78, 52, 108];
    const PADX = 60, PADT = 160;
    const rand = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
    const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
    const outBack = (x) => 1 + 2.9 * Math.pow(x - 1, 3) + 1.9 * Math.pow(x - 1, 2);
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

    const canvas = document.createElement('canvas');
    canvas.className = 'st-sprout';
    canvas.setAttribute('aria-hidden', 'true');
    stairs.append(canvas);
    const g = canvas.getContext('2d');
    let nodes = [], dpr = 1, start = 0, looping = false;

    // Each step's point: its ::before dot (9px, 4px above the step's top). Stacked on phones, the
    // sprigs are all the small one, to fit the gap above each step
    function measure() {
      const s = stairs.getBoundingClientRect();
      const W = s.width, H = s.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      Object.assign(canvas.style, { left: `${-PADX}px`, top: `${-PADT}px`, width: `${W + PADX * 2}px`, height: `${H + PADT}px` });
      canvas.width = Math.round((W + PADX * 2) * dpr);
      canvas.height = Math.round((H + PADT) * dpr);
      const stacked = window.innerWidth <= 860;
      nodes = Array.from(stairs.querySelectorAll('.grow-step')).map((st, i) => {
        const r = st.getBoundingClientRect();
        return { x: r.left - s.left + 4.5, y: r.top - s.top + 0.5, P: stacked ? 4 : [5, 6.5, 8][i] };
      });
      draw();
    }

    // Draws every sprig t ms in; returns whether any is still growing
    function draw() {
      const t = reduced ? Infinity : start ? performance.now() - start : 0;
      const W = stairs.clientWidth;
      let moving = false;
      g.setTransform(dpr, 0, 0, dpr, dpr * PADX, dpr * PADT);
      g.clearRect(-PADX, -PADT, canvas.width, canvas.height);
      nodes.forEach((n, i) => {
        const rows = SPRIG.length, t0 = i * 600;
        for (let r = 0; r < rows; r++) {
          const line = SPRIG[rows - 1 - r];
          for (let c = 0; c < line.length; c++) {
            const ch = line[c];
            if (ch === '.') continue;
            // The stem climbs row by row; each leaf follows its row, a little scattered
            const on = t0 + r * 85 + (ch === 'L' ? 120 + rand(c, r + i * 7) * 120 : 0);
            const k = clamp01((t - on) / 420);
            if (k < 1) moving = true;
            if (k <= 0) continue;
            const col = ch === '|' ? STEM : mix(FROM, TO, Math.min(1, (n.x + (c - 4) * n.P) / W));
            g.fillStyle = `rgba(${col.join(',')},${ch === '|' ? 0.9 : 0.85})`;
            g.beginPath();
            g.arc(n.x + (c - 4) * n.P, n.y - (r + 1) * n.P - 2, n.P * (ch === '|' ? 0.34 : 0.4) * outBack(k), 0, Math.PI * 2);
            g.fill();
          }
        }
      });
      return moving;
    }

    function run() {
      if (looping) return;
      looping = true;
      (function frame() {
        if (draw()) requestAnimationFrame(frame);
        else looping = false;
      })();
    }

    function check() {
      if (start) return;
      const r = stairs.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.7 && r.bottom > 0) {
        start = performance.now();
        window.removeEventListener('scroll', check);
        run();
      }
    }

    window.addEventListener('scroll', check, { passive: true });
    // Measured again whenever the staircase's size changes (fonts coming in, a resize)
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stairs);
    else window.addEventListener('resize', measure);
    measure();
    check();
  }
})();
