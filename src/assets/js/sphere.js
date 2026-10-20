// Thinking sphere: a rotating point cloud that grows from the hero slot into the stage.
// It rests as one colour (ink). Each flow node has its own colour and its own behaviour,
// and the points reorganise into it as that node is reached:
//   Trigger   — incoming signals: dashed streaks rain in from all sides and flash on impact
//   Engine    — cube: a turning cube of dots that bursts into a 3×3×3 grid and snaps back
//   Synthesis — three orbs: small spheres orbiting each other, always apart
//   Deploy    — edge network: points condense into swirling hubs, packets arc between them
// Scroll (or swipe, on phones) drives the blend. Positions come from assets/js/hero-stage.js.
(() => {
  const api = window.TinkerStage;
  const canvas = document.querySelector('.sphere-canvas');
  if (!api || !canvas) return;

  const ctx = canvas.getContext('2d');
  const pin = api.stage.querySelector('.stage-pin') || api.stage;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const N = 1536;
  const PI = Math.PI;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const norm = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // Evenly spread points on the unit sphere
  function fibonacci(count) {
    const golden = PI * (3 - Math.sqrt(5));
    return Array.from({ length: count }, (_, i) => {
      const y = 1 - ((i + 0.5) / count) * 2;
      const r = Math.sqrt(1 - y * y);
      return [Math.cos(i * golden) * r, y, Math.sin(i * golden) * r];
    });
  }

  /* ----- Per-point anchors, shared by every behaviour ----- */

  const anchors = fibonacci(N);
  const seeds = anchors.map((_, i) => (Math.sin(i * 91.7) * 43758.5453) % 1 + 1).map((v) => v % 1);

  // Trigger: points move in dashed streaks of four; about a third of the streaks fly in
  // from outside, the rest form the shell they land on
  const STREAK = 4;
  const streakHead = anchors.map((_, i) => Math.floor(i / STREAK) * STREAK);
  const incoming = streakHead.map((h) => seeds[h] < 0.38);

  // Engine: a cube. Each point gets a spot on a 16×16 grid on one of the six faces, and
  // the cell of the 3×3×3 grid that spot belongs to (so the cube can burst apart)
  const TILT = 0.42;
  const TILT_COS = Math.cos(TILT);
  const TILT_SIN = Math.sin(TILT);
  const CUBE_GRID = Math.round(Math.sqrt(N / 6));
  const CUBE_HALF = 0.52;
  const cubePoint = anchors.map((_, i) => {
    const face = i % 6;
    const k = Math.floor(i / 6) % (CUBE_GRID * CUBE_GRID);
    const a = (((k % CUBE_GRID) + 0.5) / CUBE_GRID) * 2 - 1;
    const b = ((Math.floor(k / CUBE_GRID) + 0.5) / CUBE_GRID) * 2 - 1;
    const side = face % 2 ? 1 : -1;
    const p = face < 2 ? [side, a, b] : face < 4 ? [a, side, b] : [a, b, side];
    const cell = p.map((c) => (c > 1 / 3 ? 1 : c < -1 / 3 ? -1 : 0));
    return { p, cell };
  });
  const cubeAxis = norm([1, 1, 1]);

  // Synthesis: three small orbs; each point gets an even spot on its orb's surface
  const ORBS = 3;
  const orbSpots = fibonacci(Math.ceil(N / ORBS));
  const orbSpot = anchors.map((_, i) => orbSpots[Math.floor(i / ORBS)]);

  // Deploy: hubs, each point's hub, and its offset to swirl around it
  const hubs = fibonacci(12).map((h) => norm([h[0] + 0.15, h[1], h[2] - 0.1]));
  const network = anchors.map((d, i) => {
    let hi = 0;
    hubs.forEach((h, k) => {
      if (dot(d, h) > dot(d, hubs[hi])) hi = k;
    });
    const h = hubs[hi];
    const v = [d[0] - h[0], d[1] - h[1], d[2] - h[2]];
    // Every sixth point is a packet flying to a nearby hub
    const others = hubs.map((o, k) => [k, dot(h, o)]).filter(([k]) => k !== hi).sort((a, b) => b[1] - a[1]);
    const to = hubs[others[Math.floor(seeds[i] * 3)][0]];
    const omega = Math.acos(Math.max(-1, Math.min(1, dot(h, to))));
    return { hi, h, v, hv: cross(h, v), hdotv: dot(h, v), packet: i % 6 === 0, to, omega, sinO: Math.sin(omega) || 1 };
  });

  /* ----- Behaviours: write a direction (unit) into out[0..2], radius into out[3],
     highlight into out[4], opacity into out[5] (preset to 1), and size growth into out[6]
     (preset to -1, meaning "grow with the highlight") ----- */

  function resting(i, t, out) {
    const d = anchors[i];
    out[0] = d[0]; out[1] = d[1]; out[2] = d[2]; out[3] = 1; out[4] = 0;
  }

  function incomingSignals(i, t, out) {
    if (!incoming[i]) {
      // The shell they land on, with a faint twinkle
      const d = anchors[i];
      out[0] = d[0]; out[1] = d[1]; out[2] = d[2]; out[3] = 1;
      out[4] = 0.4 * Math.pow(Math.max(0, Math.sin(t * 3 + seeds[i] * 40)), 12);
      return;
    }
    // Each streak dives in along its head's direction, speeding up, trailing members lagging
    const head = streakHead[i];
    const d = anchors[head];
    const member = i - head;
    const phase = Math.max(0, ((t * 0.45 + seeds[head] * 5) % 1) - member * 0.035);
    out[0] = d[0]; out[1] = d[1]; out[2] = d[2];
    out[3] = 1 + 0.6 * Math.pow(1 - phase, 2);
    out[4] = phase > 0.88 ? (phase - 0.88) * 8 : 0;
    out[5] = Math.min(1, phase * 5) * (1 - member * 0.2);
  }

  // Sphere-space rotation that undoes the global spin (set each frame)
  let viewCos = 1;
  let viewSin = 0;

  // Camera space (x right, y up, z toward the viewer) back to sphere space, undoing the
  // global tilt and spin, so the renderer puts the point exactly where it was placed
  function placeView(out, x, yUp, z) {
    const vy = -yUp;
    const z1 = -vy * TILT_SIN + z * TILT_COS;
    const y = vy * TILT_COS + z * TILT_SIN;
    const len = Math.hypot(x * viewCos + z1 * viewSin, y, -x * viewSin + z1 * viewCos) || 1;
    out[0] = (x * viewCos + z1 * viewSin) / len;
    out[1] = y / len;
    out[2] = (-x * viewSin + z1 * viewCos) / len;
    out[3] = len;
  }

  // The cube turns about its diagonal and every ~7s bursts apart along its 3×3×3 grid
  const CUBE_YAW = 0.3;
  const CUBE_PITCH = 0.3; // positive: seen slightly from above
  let cubeBurst = 0;
  let cubeM = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  function cube(i, t, out) {
    const { p, cell } = cubePoint[i];
    const m = cubeM;
    const qx = (p[0] + cell[0] * cubeBurst) * CUBE_HALF;
    const qy = (p[1] + cell[1] * cubeBurst) * CUBE_HALF;
    const qz = (p[2] + cell[2] * cubeBurst) * CUBE_HALF;
    const x = m[0] * qx + m[1] * qy + m[2] * qz;
    const y = m[3] * qx + m[4] * qy + m[5] * qz;
    const z = m[6] * qx + m[7] * qy + m[8] * qz;
    // Fixed three-quarter pose toward the camera
    const cy = Math.cos(CUBE_YAW), sy = Math.sin(CUBE_YAW), cp = Math.cos(CUBE_PITCH), sp = Math.sin(CUBE_PITCH);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    placeView(out, x1, y * cp - z1 * sp, y * sp + z1 * cp);
    out[4] = Math.min(1, cubeBurst * 3);
    out[6] = 0; // brighter while bursting, but the same fine dots
  }

  const orbCentres = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const orbCos = new Float32Array(ORBS);
  const orbSin = new Float32Array(ORBS);
  const ORB_SEP = 0.6;
  const ORB_RADIUS = 0.38;
  function threeOrbs(i, t, out) {
    const j = i % ORBS;
    const sp = orbSpot[i];
    const c = orbCentres[j];
    const x = c[0] + (sp[0] * orbCos[j] - sp[2] * orbSin[j]) * ORB_RADIUS;
    const y = c[1] + sp[1] * ORB_RADIUS;
    const z = c[2] + (sp[0] * orbSin[j] + sp[2] * orbCos[j]) * ORB_RADIUS;
    const len = Math.hypot(x, y, z) || 1;
    out[0] = x / len; out[1] = y / len; out[2] = z / len; out[3] = len; out[4] = 0;
  }

  // Global rotation of the whole sphere around Y
  const spin = (t) => t * 0.25 + state.morph * 2 + state.flow * 4;

  // Per-frame values shared by every point
  function prepare(t) {
    viewCos = Math.cos(spin(t));
    viewSin = Math.sin(spin(t));

    cubeBurst = 0.28 * Math.pow(0.5 - 0.5 * Math.cos(t * 0.9), 4);
    const ca = Math.cos(t * 0.5);
    const sa = Math.sin(t * 0.5);
    const C = 1 - ca;
    const [ax, ay, az] = cubeAxis;
    cubeM = [
      ca + ax * ax * C, ax * ay * C - az * sa, ax * az * C + ay * sa,
      ay * ax * C + az * sa, ca + ay * ay * C, ay * az * C - ax * sa,
      az * ax * C - ay * sa, az * ay * C + ax * sa, ca + az * az * C
    ];

    // Orbs circle each other, always apart. Their orbit is counter-rotated against the
    // global spin so the triangle always faces the viewer and no orb hides behind another.
    const sc = viewCos;
    const ss = viewSin;
    for (let j = 0; j < ORBS; j++) {
      const a = t * 0.7 + (j * 2 * PI) / ORBS;
      const across = Math.cos(a) * ORB_SEP;
      orbCentres[j][0] = across * sc;
      orbCentres[j][1] = Math.sin(a) * ORB_SEP;
      orbCentres[j][2] = -across * ss;
      orbCos[j] = Math.cos(t * (j % 2 ? 1.2 : -1.2) + j);
      orbSin[j] = Math.sin(t * (j % 2 ? 1.2 : -1.2) + j);
    }
  }

  function edgeNetwork(i, t, out) {
    const p = network[i];
    if (p.packet) {
      // Fly along the great-circle arc to the next hub, lifting off the surface mid-flight
      const phase = (t * 0.3 + seeds[i]) % 1;
      const a = Math.sin((1 - phase) * p.omega) / p.sinO;
      const b = Math.sin(phase * p.omega) / p.sinO;
      out[0] = p.h[0] * a + p.to[0] * b;
      out[1] = p.h[1] * a + p.to[1] * b;
      out[2] = p.h[2] * a + p.to[2] * b;
      out[3] = 1 + 0.2 * Math.sin(phase * PI);
      out[4] = 0.7;
      return;
    }
    // Swirl tightly around the hub, which breathes in and out
    const ang = t * (p.hi % 2 ? 0.9 : -0.9);
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const k = p.hdotv * (1 - c);
    const tight = 0.26 * (1 + 0.25 * Math.sin(t * 2 + p.hi));
    const q = norm([
      p.h[0] + (p.v[0] * c + p.hv[0] * s + p.h[0] * k) * tight,
      p.h[1] + (p.v[1] * c + p.hv[1] * s + p.h[1] * k) * tight,
      p.h[2] + (p.v[2] * c + p.hv[2] * s + p.h[2] * k) * tight
    ]);
    out[0] = q[0]; out[1] = q[1]; out[2] = q[2]; out[3] = 1; out[4] = 0;
  }

  // Behaviour 0 is the resting sphere; behaviour i + 1 belongs to flow node i
  const behaviours = [resting, incomingSignals, cube, threeOrbs, edgeNetwork];
  const last = behaviours.length - 1;
  const weights = new Float32Array(behaviours.length);
  weights[0] = 1;
  const target = new Float32Array(behaviours.length);
  const sample = new Float32Array(7);

  /* ----- Colours ----- */

  let palette = [];
  let dpr = 1;
  let state = api.state;

  // Let the canvas normalise any CSS colour, then read it back as RGB
  function toRgb(value) {
    ctx.fillStyle = '#000';
    ctx.fillStyle = value;
    const v = ctx.fillStyle;
    if (v[0] === '#') return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    return v.match(/[\d.]+/g).slice(0, 3).map(Number);
  }

  // palette[0] is the resting ink; palette[i + 1] is flow node i
  function readColors() {
    const ink = toRgb(getComputedStyle(root).getPropertyValue('--ink').trim() || '#121212');
    palette = [ink, ...api.steps.map((el) => toRgb(getComputedStyle(el).getPropertyValue('--node').trim() || '#2b4dff'))];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }

  /* ----- Which behaviour to show ----- */

  // Desktop: 0 → 1 as the sphere lands, then each node-to-node change is spread
  // across ±0.2 of a step around the moment the active card switches
  function scrollBehaviour(isCompact) {
    // Phones keep resting until the cards land; desktop fades in over the end of the grow
    if (!state.landed) return isCompact ? 0 : easeInOut(clamp((state.morph - 0.85) / 0.15));
    let p = 1;
    for (let b = 1; b < api.count; b++) p += easeInOut(clamp((state.stepFloat - (b - 0.2)) / 0.4));
    return Math.min(p, last);
  }

  function updateWeights(isCompact) {
    target.fill(0);
    const p = scrollBehaviour(isCompact);
    const a = Math.floor(p);
    const f = p - a;
    target[a] += 1 - f;
    target[Math.min(a + 1, last)] += f;
    // Follow the scroll (or swipe) closely, with a little smoothing
    const follow = reduced ? 1 : 0.2;
    for (let s = 0; s < weights.length; s++) weights[s] += (target[s] - weights[s]) * follow;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const s = state.slotRect;
    const g = state.targetRect;
    if (!s || !g) return;

    const isCompact = api.stage.classList.contains('is-compact');
    const active = state.landed && state.step >= 0 ? state.step : -1;
    updateWeights(isCompact);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);

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
    if (cy + R < -40 || cy - R > vh + 40) return;

    const t = reduced ? 0 : now / 1000;
    prepare(t);

    const color = [0, 0, 0];
    weights.forEach((w, b) => {
      color[0] += palette[b][0] * w;
      color[1] += palette[b][1] * w;
      color[2] += palette[b][2] * w;
    });
    const fill = `rgb(${color.map(Math.round).join(',')})`;

    const cosY = viewCos;
    const sinY = viewSin;
    const cosT = TILT_COS;
    const sinT = TILT_SIN;
    const cubeWeight = weights[2];
    const dotScale = Math.min(1.3, Math.max(0.55, R / 200));
    const live = [];
    weights.forEach((w, b) => { if (w > 0.002) live.push(b); });

    ctx.fillStyle = fill;
    for (let i = 0; i < N; i++) {
      // Blend the live behaviours: average the directions, blend radius, highlight and opacity
      let dx = 0;
      let dy = 0;
      let dz = 0;
      let r = 0;
      let glow = 0;
      let fade = 0;
      let grow = 0;
      for (const b of live) {
        const w = weights[b];
        sample[5] = 1;
        sample[6] = -1;
        behaviours[b](i, t, sample);
        fade += sample[5] * w;
        dx += sample[0] * w;
        dy += sample[1] * w;
        dz += sample[2] * w;
        r += sample[3] * w;
        glow += sample[4] * w;
        grow += (sample[6] < 0 ? sample[4] : sample[6]) * w;
      }
      const len = Math.hypot(dx, dy, dz) || 1;
      const px = dx / len;
      const py = dy / len;
      const pz = dz / len;

      const x1 = px * cosY - pz * sinY;
      const z1 = px * sinY + pz * cosY;
      const y2 = py * cosT - z1 * sinT;
      const z2 = py * sinT + z1 * cosT;

      // Slow surface ripple: the "thinking" (calmed for the cube, so its edges stay straight)
      const wave = 1 + 0.05 * (1 - cubeWeight) * Math.sin(py * 5 + t * 1.8) * Math.cos(x1 * 4 - t * 1.2);
      const scale = R * r * wave * (1 + z2 * 0.1);
      const depth = (z2 + 1) / 2;
      const size = (0.8 + 1.6 * depth) * dotScale * (1 + grow);

      if (fade < 0.02) continue;
      ctx.globalAlpha = Math.min(1, 0.1 + 0.75 * depth * depth + glow * 0.3) * fade;
      ctx.fillRect(cx + x1 * scale - size / 2, cy + y2 * scale - size / 2, size, size);
    }

    // Dashed connector from the sphere's surface to the active card.
    // Skipped on phones, where the cards sit right next to the sphere.
    const card = active >= 0 ? api.steps[active] : null;
    if (card && !isCompact) {
      const rc = card.getBoundingClientRect();
      const angle = Math.atan2(rc.top + rc.height / 2 - cy, rc.left + rc.width / 2 - cx);
      const sx = cx + Math.cos(angle) * R * 1.15;
      const sy = cy + Math.sin(angle) * R * 1.15;
      const ex = Math.max(rc.left, Math.min(sx, rc.right));
      const ey = Math.max(rc.top, Math.min(sy, rc.bottom));
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -t * 24;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillRect(ex - 3, ey - 3, 6, 6);
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
