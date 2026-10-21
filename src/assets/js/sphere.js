// Thinking sphere: a rotating point cloud that grows from the hero slot into the stage, then
// carries "Make it. Use it. Move on." as a lens:
//   - the three lines are set huge behind the orb and glide in one after another with the scroll
//     (through a spring, so they ease rather than jump); the first slides in from the right as the
//     orb lands. Inside the orb they're magnified and blue
//   - the orb spins on its own clock; scrolling speeds the spin up, then it eases back
//   - after the last line the words fade and the orb explodes into particles
// Positions and progress come from assets/js/hero-stage.js.
(() => {
  const api = window.TinkerStage;
  const canvas = document.querySelector('.sphere-canvas');
  if (!api || !canvas) return;

  const ctx = canvas.getContext('2d');
  const pin = api.stage.querySelector('.stage-pin') || api.stage;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LINES = [['Make', ' it.'], ['Use', ' it.'], ['Move', ' on.']];
  const LINES_END = 0.74; // the lines take the first 74% of the pinned scroll, the explosion the rest
  const BASE_SPIN = 0.35; // rad/s when nobody is scrolling

  const N = 1536;
  const PI = Math.PI;
  const TILT_COS = Math.cos(0.42);
  const TILT_SIN = Math.sin(0.42);
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rand = (i, s) => {
    const v = Math.sin(i * 91.7 + s * 47.3) * 43758.5453;
    return v - Math.floor(v);
  };

  // Evenly spread points on the unit sphere
  const points = Array.from({ length: N }, (_, i) => {
    const y = 1 - ((i + 0.5) / N) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = i * PI * (3 - Math.sqrt(5));
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });
  // Each point's flight when the orb explodes: direction, distance and a little stagger
  const burstAngle = points.map((_, i) => rand(i, 2) * PI * 2);
  const burstReach = points.map((_, i) => 0.25 + rand(i, 3) * 0.5);
  const burstDelay = points.map((_, i) => rand(i, 7) * 0.3);

  // Continuous line index 0 → 2: each line holds for the first 60% of its third, then moves on
  function holdStep(q) {
    const c = q * 3;
    const s = Math.min(2, Math.floor(c));
    return s < 2 ? s + easeInOut(clamp((c - s - 0.6) / 0.4)) : 2;
  }

  /* ----- Colours and canvas size ----- */

  let colors = {};
  let dpr = 1;
  let state = api.state;

  function readColors() {
    const cs = getComputedStyle(root);
    colors = {
      ink: cs.getPropertyValue('--ink').trim() || '#121212',
      bg: cs.getPropertyValue('--bg').trim() || '#eee9e2',
      accent: cs.getPropertyValue('--accent').trim() || '#2b4dff'
    };
  }

  // Size the drawing buffer to the canvas's real on-screen size. On phones 100vh and innerHeight
  // differ while the address bar shows, so measuring the element avoids a stretched picture.
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }

  /* ----- Motion state ----- */

  let spin = 0;
  let spinVel = BASE_SPIN;
  let rot = -1; // -1: the first line waiting off-screen to the right
  let lastY = window.scrollY;
  let lastNow = null;

  function drawWords(vw, vh, cy, R, cx, alpha, lensAlpha) {
    ctx.font = '600 100px Geist, -apple-system, BlinkMacSystemFont, sans-serif';
    const widest = Math.max(...LINES.map((l) => ctx.measureText(l[0] + l[1]).width));
    const size = Math.min(vh * 0.42, (100 * vw * 0.86) / widest);
    ctx.font = `600 ${size}px Geist, -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Lay the lines out in a row, half a screen apart, and slide the row to the current one
    const gap = vw * 0.5;
    const centres = [];
    let x = 0;
    LINES.forEach((l) => {
      const w = ctx.measureText(l[0] + l[1]).width;
      centres.push(x + w / 2);
      x += w + gap;
    });
    // Below 0 the first line is still sliding in from where the next ones come from
    const k = Math.max(0, Math.min(Math.floor(rot), 2));
    const shift = rot < 0
      ? centres[0] + rot * (centres[1] - centres[0])
      : lerp(centres[k], centres[Math.min(k + 1, 2)], rot - k);
    const paint = (color) => {
      ctx.fillStyle = color;
      LINES.forEach((l, i) => ctx.fillText(l[0] + l[1], vw / 2 + centres[i] - shift, cy + size * 0.04));
    };

    ctx.globalAlpha = alpha;
    paint(colors.ink);

    // The lens: inside the orb the words are magnified and blue
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.03, 0, PI * 2);
    ctx.clip();
    ctx.globalAlpha = lensAlpha;
    ctx.fillStyle = colors.bg;
    ctx.fillRect(cx - R * 1.1, cy - R * 1.1, R * 2.2, R * 2.2);
    ctx.translate(cx, cy);
    ctx.scale(1.18, 1.18);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = alpha;
    paint(colors.accent);
    ctx.restore();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const s = state.slotRect;
    const g = state.targetRect;
    if (!s || !g) return;

    // Spin: a steady base speed, pushed faster by scrolling and easing back afterwards
    const dt = lastNow === null ? 0 : Math.min((now - lastNow) / 1000, 0.1);
    const screensPerSec = dt ? Math.abs(window.scrollY - lastY) / window.innerHeight / dt : 0;
    lastNow = now;
    lastY = window.scrollY;

    const q = state.flow;
    // The first line slides in as the orb lands, then the scroll steps through the lines
    const entry = easeInOut(clamp((state.morph - 0.75) / 0.25));
    const target = holdStep(clamp(q / LINES_END)) - (1 - entry);
    if (reduced) {
      rot = target;
    } else {
      const wantVel = BASE_SPIN + Math.min(5, screensPerSec * 8);
      spinVel += (wantVel - spinVel) * (1 - Math.exp(-dt * 3));
      spin += spinVel * dt;
      rot += (target - rot) * (1 - Math.exp(-dt * 5));
    }

    const isCompact = api.stage.classList.contains('is-compact');
    const vw = canvas.clientWidth;
    const vh = canvas.clientHeight;
    if (canvas.width !== Math.round(vw * dpr) || canvas.height !== Math.round(vh * dpr)) resize();
    // Clear the whole buffer, not just the visible part, so nothing from an earlier frame lingers
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let cx;
    let cy;
    let R;
    if (isCompact) {
      // Phones: same size throughout. Ride up with the page until reaching the spot it will
      // hold in the pinned stage, wait there while the hero scrolls out, then leave with the stage.
      const pinTop = pin.getBoundingClientRect().top;
      const targetCy = g.top + g.height / 2;
      const pinnedCy = targetCy - pinTop;
      cx = g.left + g.width / 2;
      cy = Math.max(s.top + s.height / 2, Math.min(pinnedCy, targetCy));
      R = (g.width / 2) * 0.84;
    } else {
      // Desktop: grow from the hero slot into the stage as the title docks
      const k = state.eased;
      cx = lerp(s.left + s.width / 2, g.left + g.width / 2, k);
      cy = lerp(s.top + s.height / 2, g.top + g.height / 2, k);
      R = lerp(s.width / 2, g.width / 2, k) * 0.84;
    }
    if (cy + R < -vh || cy - R > vh * 2) return;

    const t = reduced ? 0 : now / 1000;
    const outro = clamp((q - LINES_END) / (1 - LINES_END));
    const burst = clamp((outro - 0.1) / 0.9);
    const textAlpha = 1 - clamp(outro / 0.3);

    if (entry > 0 && textAlpha > 0.001) drawWords(vw, vh, cy, R, cx, textAlpha, entry * (1 - burst));

    // The orb (and, at the end, its particles flying apart)
    const cosY = Math.cos(spin);
    const sinY = Math.sin(spin);
    const dotScale = Math.min(1.3, Math.max(0.55, R / 200));
    const reach = Math.max(vw, vh);
    ctx.fillStyle = colors.ink;
    for (let i = 0; i < N; i++) {
      const [px, py, pz] = points[i];
      const x1 = px * cosY - pz * sinY;
      const z1 = px * sinY + pz * cosY;
      const y2 = py * TILT_COS - z1 * TILT_SIN;
      const z2 = py * TILT_SIN + z1 * TILT_COS;

      // Slow surface ripple: the "thinking"
      const wave = 1 + 0.04 * Math.sin(py * 5 + t * 1.8) * Math.cos(x1 * 4 - t * 1.2);
      const scale = R * wave * (1 + z2 * 0.1);
      const depth = (z2 + 1) / 2;
      let x = cx + x1 * scale;
      let y = cy + y2 * scale;
      let alpha = Math.min(1, 0.1 + 0.75 * depth * depth) * 0.9;

      if (burst > 0) {
        const fly = easeInOut(clamp(burst * 1.3 - burstDelay[i]));
        const d = fly * reach * burstReach[i];
        x += Math.cos(burstAngle[i]) * d;
        y += Math.sin(burstAngle[i]) * d;
        alpha *= 1 - fly;
        if (alpha < 0.01) continue;
      }

      const size = (0.8 + 1.6 * depth) * dotScale;
      ctx.globalAlpha = alpha;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  readColors();
  resize();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
  window.addEventListener('resize', resize);
  api.on((s) => { state = s; });
  canvas.classList.add('is-ready');
  requestAnimationFrame(frame);
})();
