// Hero ambient (trial): something alive in the hero's dark edges, on one canvas behind the copy.
// Picked by html[data-hero-ambient] (head.njk: the page's heroAmbient, or ?ambient=<name>):
//   veins       a sage leaf's veins, which are also a neural network: they grow in from the edges
//               towards the copy, branching, and sun-yellow signals travel in along them
//   lens        the light in the middle follows the pointer (and drifts on its own without one),
//               lighting up a fine grid of points in the dark as it passes
//   veins-lens  the two together: the veins barely there until the light passes over them
//   drift       a few of the intro's leaves, still drifting slowly through the hero; the pointer
//               stirs them as it passes, pushing them aside and carrying them along its way
// It starts once the intro has landed, and only draws while the hero is on screen.
(() => {
  const root = document.documentElement;
  const variant = root.dataset.heroAmbient;
  const hero = document.getElementById('hero');
  if (!variant || !hero) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasVeins = variant === 'veins' || variant === 'veins-lens';
  const hasLens = variant === 'lens' || variant === 'veins-lens';

  // The theme's light and glow (style.css, --lens and --glow), as "r, g, b"
  const css = getComputedStyle(hero);
  const LENS = css.getPropertyValue('--lens').trim() || '169, 186, 134';
  const GLOW = css.getPropertyValue('--glow').trim() || '254, 200, 32';

  const canvas = document.createElement('canvas');
  canvas.className = 'ha-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = 1, start = 0, last = 0, onScreen = true;
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const range = (a, b) => a + rnd() * (b - a);

  // A soft glow, stamped for the pulses
  const glow = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 48;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    r.addColorStop(0, 'rgba(254, 214, 90, 1)');
    r.addColorStop(0.3, `rgba(${GLOW}, 0.4)`);
    r.addColorStop(1, `rgba(${GLOW}, 0)`);
    g.fillStyle = r;
    g.fillRect(0, 0, 48, 48);
    return c;
  })();

  // ---- Veins: grown once per size, from roots on both edges, stopping short of the lit middle ----
  let segs = [], tips = [], pulses = [], nextPulse = 0, growEnd = 0;
  function growVeins() {
    seed = 11;
    segs = [];
    const cx = W / 2, cy = H / 2;
    const rx = W * 0.28, ry = H * 0.3;
    const speed = Math.max(W, 900) * 0.28; // px a second
    const stepL = Math.max(W, 700) * 0.06;
    const queue = [];
    [-1, 1].forEach((side) => {
      const n = W < 700 ? 4 : 6;
      for (let i = 0; i < n; i++) {
        const y = H * ((i + 0.5) / n) + range(-0.05, 0.05) * H;
        queue.push({ x: side < 0 ? -8 : W + 8, y, a: (side < 0 ? 0 : Math.PI) + range(-0.5, 0.5), L: stepL * range(0.9, 1.2), d: 0, t: range(0, 0.4), parent: -1 });
      }
    });
    while (queue.length && segs.length < 900) {
      const b = queue.shift();
      // Bend gently towards the middle
      let toC = Math.atan2(cy - b.y, cx - b.x) - b.a;
      toC = Math.atan2(Math.sin(toC), Math.cos(toC));
      const a = b.a + toC * 0.12 + range(-0.25, 0.25);
      const x2 = b.x + Math.cos(a) * b.L, y2 = b.y + Math.sin(a) * b.L;
      const inLens = ((x2 - cx) / rx) ** 2 + ((y2 - cy) / ry) ** 2 < 1;
      if (inLens || y2 < -20 || y2 > H + 20 || x2 < -20 || x2 > W + 20) continue;
      const t1 = b.t + b.L / speed;
      const i = segs.push({ x1: b.x, y1: b.y, x2, y2, d: b.d, t0: b.t, t1, parent: b.parent, kids: 0 }) - 1;
      if (b.parent >= 0) segs[b.parent].kids++;
      if (b.d >= 8 || b.L < 10) continue;
      queue.push({ x: x2, y: y2, a, L: b.L * range(0.78, 0.92), d: b.d + 1, t: t1, parent: i });
      if (rnd() < 0.5) {
        const side = rnd() < 0.5 ? -1 : 1;
        queue.push({ x: x2, y: y2, a: a + side * range(0.45, 0.85), L: b.L * range(0.55, 0.75), d: b.d + 1, t: t1, parent: i });
      }
    }
    tips = segs.map((s, i) => i).filter((i) => !segs[i].kids);
    growEnd = Math.max(0, ...segs.map((s) => s.t1));
    pulses = [];
  }

  // A signal from a root out to a tip: the chain of segments, root first
  function spawnPulse(now) {
    if (!tips.length) return;
    const path = [];
    for (let i = tips[Math.floor(Math.random() * tips.length)]; i >= 0; i = segs[i].parent) path.unshift(segs[i]);
    const len = path.reduce((a, s) => a + Math.hypot(s.x2 - s.x1, s.y2 - s.y1), 0);
    pulses.push({ path, len, born: now, speed: Math.max(W, 900) * 0.32 });
  }

  function pointOn(path, dist) {
    for (const s of path) {
      const l = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      if (dist <= l) return [s.x1 + ((s.x2 - s.x1) * dist) / l, s.y1 + ((s.y2 - s.y1) * dist) / l];
      dist -= l;
    }
    const e = path[path.length - 1];
    return [e.x2, e.y2];
  }

  // ---- Lens: follows the pointer over the hero, or drifts on its own -------------------------------
  const lens = { x: 0, y: 0, tx: 0, ty: 0, seen: 0 };
  // The pointer over the hero, and how fast it's moving (px a second, smoothed), for the leaves
  const ptr = { x: 0, y: 0, vx: 0, vy: 0, at: 0 };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now();
    lens.tx = x;
    lens.ty = y;
    lens.seen = now;
    const dt = Math.max(8, now - ptr.at) / 1000;
    if (ptr.at && now - ptr.at < 200) {
      ptr.vx += ((x - ptr.x) / dt - ptr.vx) * 0.5;
      ptr.vy += ((y - ptr.y) / dt - ptr.vy) * 0.5;
    }
    ptr.x = x;
    ptr.y = y;
    ptr.at = now;
  }, { passive: true });
  // How lit a point is by the lens (1 at its middle)
  const lit = (x, y) => Math.exp(-(((x - lens.x) / (W * 0.24)) ** 2 + ((y - lens.y) / (H * 0.3)) ** 2) * 1.6);

  // ---- Drift: a few leaves ------------------------------------------------------------------------
  let leaves = [], leafImgs = [];
  // With --leaf-flow (style.css), the leaves follow a winding current instead of drifting across
  const flow = getComputedStyle(root).getPropertyValue('--leaf-flow').trim() === '1';
  function makeLeaves() {
    seed = 23;
    // Real sage leaves, as in the intro (sage-leaf.js)
    leafImgs = SageLeaf.make(8, SageLeaf.tones());
    leaves = Array.from({ length: W < 700 ? 6 : 12 }, () => {
      const z = range(0.25, 1);
      return {
        x: rnd() * W, y: rnd() * H, z, size: (0.6 + z * 1.3) * (W < 700 ? 0.7 : 1),
        rot: rnd() * 6.28, spin: range(-0.6, 0.6), flip: rnd() * 6.28, fr: range(0.8, 2), ph: rnd() * 6.28,
        // What the pointer has given it: speed, spin and tumble, which die away
        vx: 0, vy: 0, vr: 0, vf: 0,
        leaf: leafImgs[Math.floor(rnd() * leafImgs.length)],
      };
    }).sort((a, b) => a.z - b.z);
  }

  // ---- Frame --------------------------------------------------------------------------------------
  function size() {
    W = hero.clientWidth;
    // The first screen of the hero is enough: below it is the burn's (hero-burn.js)
    H = Math.min(hero.offsetHeight, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lens.x = lens.tx = W / 2;
    lens.y = lens.ty = H / 2;
    if (hasVeins) growVeins();
    if (variant === 'drift') makeLeaves();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!start || !onScreen || document.hidden) { last = now; return; }
    const t = reduced ? 99 : (now - start) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);

    if (hasLens) {
      // With no pointer for a while, it wanders round the middle on its own
      if (now - lens.seen > 3000) {
        lens.tx = W / 2 + Math.sin(t * 0.37) * W * 0.18;
        lens.ty = H / 2 + Math.sin(t * 0.53 + 1) * H * 0.14;
      }
      const k = reduced ? 1 : 1 - Math.pow(0.001, dt);
      lens.x += (lens.tx - lens.x) * k;
      lens.y += (lens.ty - lens.y) * k;
      // The light itself
      ctx.save();
      ctx.translate(lens.x, lens.y);
      ctx.scale(1, 0.5);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.min(620, W * 0.75));
      g.addColorStop(0, `rgba(${LENS}, 0.16)`);
      g.addColorStop(1, `rgba(${LENS}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(-W * 1.5, -H * 3, W * 3, H * 6);
      ctx.restore();
    }

    if (variant === 'lens') {
      // A fine grid of points, lit where the light falls
      const gap = W < 700 ? 18 : 24;
      ctx.fillStyle = 'rgb(214, 222, 190)';
      for (let y = gap / 2; y < H; y += gap) {
        for (let x = gap / 2; x < W; x += gap) {
          const l = lit(x, y);
          if (l < 0.02) continue;
          ctx.globalAlpha = 0.05 + 0.5 * l;
          ctx.fillRect(x - 0.8, y - 0.8, 1.6 + l, 1.6 + l);
        }
      }
      ctx.globalAlpha = 1;
    }

    if (hasVeins) {
      ctx.lineCap = 'round';
      for (const s of segs) {
        if (t < s.t0) continue;
        const k = Math.min((t - s.t0) / (s.t1 - s.t0), 1);
        const x2 = s.x1 + (s.x2 - s.x1) * k, y2 = s.y1 + (s.y2 - s.y1) * k;
        const a = variant === 'veins' ? 0.24 : 0.05 + 0.45 * lit((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2);
        ctx.strokeStyle = `rgba(${LENS}, ${a})`;
        ctx.lineWidth = Math.max(0.6, 2.2 - s.d * 0.22);
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // A node where it branches
        if (k === 1 && s.kids > 1) {
          ctx.fillStyle = `rgba(196, 210, 160, ${Math.min(1, a * 2)})`;
          ctx.beginPath();
          ctx.arc(s.x2, s.y2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Signals, once it has grown
      if (!reduced && t > growEnd * 0.6) {
        if (now > nextPulse) { spawnPulse(now); nextPulse = now + (W < 700 ? 700 : 380); }
        ctx.globalCompositeOperation = 'lighter';
        pulses = pulses.filter((p) => {
          const d = ((now - p.born) / 1000) * p.speed;
          if (d > p.len + 40) return false;
          for (let j = 0; j < 5; j++) {
            const [x, y] = pointOn(p.path, Math.max(0, d - j * 7));
            const fade = (1 - j / 5) * Math.min(1, (p.len + 40 - d) / 60);
            ctx.globalAlpha = fade * (j ? 0.45 : 1);
            const r = j ? 8 : 14;
            ctx.drawImage(glow, x - r, y - r, r * 2, r * 2);
          }
          return true;
        });
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    if (variant === 'drift') {
      const s = t;
      // The pointer's wake: still for a moment after it stops, then gone
      const stir = !reduced && now - ptr.at < 600;
      ptr.vx *= Math.pow(0.02, dt);
      ptr.vy *= Math.pow(0.02, dt);
      const R = W < 700 ? 110 : 170;
      for (const l of leaves) {
        if (stir) {
          const dx = l.x - ptr.x, dy = l.y - ptr.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < R) {
            // Pushed out of the way, and carried along the way the pointer is going; near leaves more
            const k = (1 - d / R) ** 2 * (0.45 + 0.55 * l.z);
            const speed = Math.min(Math.hypot(ptr.vx, ptr.vy), 2400);
            l.vx += ((dx / d) * 520 * k + ptr.vx * 2.2 * k) * dt;
            l.vy += ((dy / d) * 520 * k + ptr.vy * 2.2 * k) * dt;
            // Spun the way it's brushed past, and flipped over
            l.vr += Math.sign(dx * ptr.vy - dy * ptr.vx || 1) * k * (2 + speed / 120) * dt * 6;
            l.vf += k * (3 + speed / 90) * dt * 6;
          }
        }
        if (!reduced) {
          l.x += l.vx * dt;
          l.y += l.vy * dt;
          l.rot += l.vr * dt;
          l.flip += l.vf * dt;
          const damp = Math.pow(0.15, dt);
          l.vx *= damp;
          l.vy *= damp;
          l.vr *= damp;
          l.vf *= damp;
        }
        if (!reduced && flow) {
          // A slow, winding current: the way it runs here and now, and each leaf turning to follow it
          const a = Math.sin(l.y * 0.004 + s * 0.3) * 0.7 + Math.sin(l.x * 0.003 - s * 0.2 + l.ph) * 0.45;
          const v = 22 + 38 * l.z;
          l.x += Math.cos(a) * v * dt;
          l.y += Math.sin(a) * v * dt;
          l.rot += (a + Math.sin(s * 0.8 + l.ph) * 0.35 - l.rot) * Math.min(1, dt * 1.5);
          l.flip += l.fr * 0.5 * dt;
          if (l.x > W + 60) { l.x = -60; l.y = Math.random() * H; }
          if (l.y > H + 40) l.y = -40;
          if (l.y < -40) l.y = H + 40;
        } else if (!reduced) {
          l.x += (14 + 30 * l.z) * dt;
          l.y += (Math.sin(s * 0.9 + l.ph) * 14 * l.z + 6) * dt;
          l.rot += l.spin * dt;
          l.flip += l.fr * dt;
          if (l.x > W + 60) { l.x = -60; l.y = Math.random() * H; }
          if (l.y > H + 40) l.y = -40;
        }
        ctx.globalAlpha = (0.4 + 0.6 * l.z) * Math.min(1, t / 1.2);
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.rot);
        ctx.scale(l.size, l.size * (Math.cos(l.flip) || 0.001));
        // Its underside as it turns over; out of focus when far
        const img = Math.cos(l.flip) < 0 ? l.leaf.under : l.z < 0.45 ? l.leaf.soft : l.leaf.top;
        ctx.drawImage(img, -SageLeaf.W / 2, -SageLeaf.H / 2, SageLeaf.W, SageLeaf.H);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  size();
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 200); });
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(canvas);
  const begin = () => { start = performance.now(); };
  if (root.classList.contains('has-intro')) document.addEventListener('tinker:intro-done', begin, { once: true });
  else begin();
  requestAnimationFrame(frame);
})();
