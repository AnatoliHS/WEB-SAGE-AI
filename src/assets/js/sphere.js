// Thinking orb: a ring of slow, wavy light strands that grows from the hero slot into the stage,
// then carries "Make it. Use it. Share it." as a lens:
//   - in the hero it's a flat ring of comets (concept A in /concepts/orb/); on the way to the
//     stage the comets move out to just beyond the lens edge and keep circling there in a band
//     (concept B, Orbit, in /concepts/orb-stage/), so nothing is ever drawn across the word
//   - the three lines are set huge behind the orb and glide in one after another with the scroll
//     (through a spring, so they ease rather than jump); the first slides in from the right as the
//     orb lands. Inside the orb they're magnified and blue
//   - the orb runs on its own clock: brisk in the hero, a slow drift once landed, and sped up by
//     scrolling and by each line sliding in, easing back afterwards
//   - after the last line the words fade and the strands break into particles that fly apart
//   - further down, as the Meet Tinker demo comes up the screen, the particles fly back together
//     into the hero halo above its prompt ([data-orb-dock]). Then, as the pinned demo steps through
//     (concept in /concepts/orb-steps/), the halo builds the app: its strands run round the app
//     window, header and tiles (Build), then round the blocks of text being translated (Remix),
//     then fly in straight lines into the two other people's cards as small halos (Share). It
//     takes each step's colour
// Positions and progress come from assets/js/hero-stage.js, and for the demo from window.TinkerLive
// (scripts.njk).
(() => {
  const api = window.TinkerStage;
  const canvas = document.querySelector('.sphere-canvas');
  if (!api || !canvas) return;

  const mainCtx = canvas.getContext('2d');
  // What's drawn on: the fixed canvas, or for the demo's halo, the demo's own canvas (liveCanvas)
  let ctx = mainCtx;
  // The demo's halo is drawn on a canvas inside the demo, so it scrolls with the page like the rest
  // of the content; on the fixed canvas it trailed the page while a phone scrolled
  const liveCanvas = document.querySelector('.live-canvas');
  const liveCtx = liveCanvas ? liveCanvas.getContext('2d') : null;
  let liveDrawn = false;
  // Phones: while the orb moves with the page (riding up with the hero, or leaving with the stage) it's
  // drawn on a canvas inside the sticky pin, which the browser scrolls with the content; while it holds
  // still on screen, on the fixed canvas
  const pinCanvas = api.stage.querySelector('.stage-canvas');
  const pinCtx = pinCanvas ? pinCanvas.getContext('2d') : null;
  let pinDrawn = false;

  // Size a canvas inside the page to its box, and clear it if anything was drawn on it last frame
  function prepare(c, context, drawn) {
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    } else if (drawn) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, c.width, c.height);
    }
  }

  // Draw in screen pixels on a canvas inside the page, shifted by where it sits on screen right now
  function drawOn(c, context, draw) {
    const b = c.getBoundingClientRect();
    ctx = context;
    ctx.setTransform(dpr, 0, 0, dpr, -b.left * dpr, -b.top * dpr);
    draw();
    ctx = mainCtx;
  }
  const pin = api.stage.querySelector('.stage-pin') || api.stage;
  const dock = document.querySelector('[data-orb-dock]');
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const LINES = [['Make', ' it.'], ['Use', ' it.'], ['Share', ' it.']];
  const LINES_END = 0.74; // the lines take the first 74% of the pinned scroll, the explosion the rest
  const HERO_SPEED = 1.4; // the orb's clock rate in the hero when nobody is scrolling
  const LANDED_SPEED = 0.45; // ...and once it has landed in the stage

  const PI = Math.PI;
  const TAU = PI * 2;
  const COUNT = 150; // strands
  const SAMPLES = 72; // points along each strand
  const CHUNK = 6; // points per stroke; each stroke gets its own alpha so the ends can fade
  const DOT_STEP = 4; // every 4th point becomes a particle in the explosion
  const WAVE_EVERY = 5; // every 5th strand runs along the features' progress line
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rand = (i, s) => {
    const v = Math.sin(i * 91.7 + s * 47.3) * 43758.5453;
    return v - Math.floor(v);
  };
  // Seeded random so the strands match the concepts pages exactly
  const seeded = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Every strand is a comet: it fades toward the tail and has a bright head
  const cometFade = (u) => Math.pow(u, 1.7);

  // A strand's rounded tip: a half disc, the line's own width, past its last point (from x0, y0 to
  // x1, y1), so it doesn't overlap the line and show as a dot
  function strandTip(x0, y0, x1, y1, width) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath();
    ctx.arc(x1, y1, width / 2, a - PI / 2, a + PI / 2);
    ctx.fill();
  }

  /* ----- The hero ring: radii and amounts in units of the orb's radius, speeds per second ----- */

  const RING = { seed: 23, radius: [0.42, 0.98], length: [1.2, 3.2], drift: [0.22, 0.55], wobble: 0.065, wobbleSpeed: 0.3, jitter: 0.09, squash: [0.78, 1], alpha: [0.08, 0.9] };

  const ring = (() => {
    const rnd = seeded(RING.seed);
    const between = ([a, b]) => a + (b - a) * rnd();
    const sign = () => (rnd() < 0.5 ? -1 : 1);
    return Array.from({ length: COUNT }, () => {
      // Most strands faint, a few bright
      const bright = Math.pow(rnd(), 2.4);
      const s = {
        r0: between(RING.radius),
        a0: rnd() * TAU,
        len: between(RING.length),
        drift: between(RING.drift),
        waves: [2, 3, 5].map((n) => ({
          n,
          amp: (RING.wobble * (0.3 + 0.7 * rnd())) / (n * 0.5),
          phase: rnd() * TAU,
          speed: RING.wobbleSpeed * (0.5 + 0.5 * rnd()) * sign()
        })),
        ox: (rnd() * 2 - 1) * RING.jitter,
        oy: (rnd() * 2 - 1) * RING.jitter,
        jp: rnd() * TAU,
        js: 0.1 + 0.2 * rnd(),
        squash: between(RING.squash),
        turn: rnd() * TAU
      };
      // The random stream above must stay in this order to match the concepts pages
      rnd(); rnd();
      s.alpha = RING.alpha[0] + (RING.alpha[1] - RING.alpha[0]) * bright;
      s.width = 0.6 + 0.9 * bright;
      return s;
    });
  })();

  // The brightest of the strands along the features' progress line, left out of it: it stood out in
  // front of the rest instead of weaving in with them
  const WAVE_SKIP = ring.reduce((best, s, k) => (k % WAVE_EVERY === 0 && s.alpha > ring[best].alpha ? k : best), 0);

  // A strand's points in the hero ring at time t, in orb units
  function traceRing(s, t, xs, ys) {
    const ox = s.ox + Math.sin(t * s.js + s.jp) * RING.jitter * 0.5;
    const oy = s.oy + Math.cos(t * s.js * 0.8 + s.jp) * RING.jitter * 0.5;
    const turn = s.turn + t * 0.015;
    const ct = Math.cos(turn);
    const st = Math.sin(turn);
    for (let i = 0; i < SAMPLES; i++) {
      const th = s.a0 + s.drift * t + (i / (SAMPLES - 1)) * s.len;
      let r = s.r0;
      for (const w of s.waves) r += w.amp * Math.sin(w.n * th + w.phase + w.speed * t);
      const ex = Math.cos(th) * r;
      const ey = Math.sin(th) * r * s.squash;
      xs[i] = ex * ct - ey * st + ox;
      ys[i] = ex * st + ey * ct + oy;
    }
  }

  // ...and in the landed orbit: a band of comets just outside the lens edge (1.03)
  function traceOrbit(k, s, t, xs, ys) {
    const r0 = 1.04 + Math.pow(rand(k, 21), 1.5) * 0.2;
    const len = 0.8 + rand(k, 22) * 1.6;
    const a0 = s.a0 + t * (0.3 + rand(k, 23) * 0.35);
    const ph = rand(k, 24) * TAU;
    for (let i = 0; i < SAMPLES; i++) {
      const th = a0 + (i / (SAMPLES - 1)) * len;
      const r = r0 + 0.025 * Math.sin(2 * th + t * 0.5 + ph);
      xs[i] = Math.cos(th) * r;
      ys[i] = Math.sin(th) * r;
    }
  }

  /* ----- Meet Tinker: where the strands are in the demo, in screen pixels -----
     halo: the hero ring at x, y, radius R
     wave: the features' progress line, from x, y and w long: the strands wound into a small ring (R)
       at its start, unrolling to the right into wavy lines as far as progress p; the tail then runs
       along after them (tail, 0 → 1 of the way), winding them back into the ring at the tip
     scatter: particles flung far out (the explosion's end) */

  function fillPose(pose, k, s, t, xs, ys, vw, vh) {
    if (pose.type === 'halo') {
      traceRing(s, t, xs, ys);
      for (let i = 0; i < SAMPLES; i++) {
        xs[i] = pose.x + xs[i] * pose.R;
        ys[i] = pose.y + ys[i] * pose.R;
      }
    } else if (pose.type === 'wave') {
      // Some strands a little behind the rest, so the front is feathered, catching up by the end
      const x0 = pose.x + pose.w * pose.tail;
      const L = Math.max(0, pose.w * pose.p * (1 - 0.3 * rand(k, 86) * (1 - pose.p * pose.p)) - pose.w * pose.tail);
      const open = easeInOut(clamp(L / 80));
      // Each strand its own wave, so they weave over and under one another as they run along
      const amp = pose.A * (0.2 + 0.8 * rand(k, 81));
      const freq = TAU / (220 + 260 * rand(k, 82));
      const flow = (0.8 + 1.2 * rand(k, 83)) * (rand(k, 84) < 0.5 ? -1 : 1);
      const ph = rand(k, 85) * TAU;
      traceRing(s, t, xs, ys);
      for (let i = 0; i < SAMPLES; i++) {
        const d = (i / (SAMPLES - 1)) * L;
        // Pinched together at the start, where they come out of the ring, and drawn back together
        // to a point at the front, so the line tapers at both ends. The waves keep their place along
        // the line as the tail runs up it
        const y = pose.y + amp * Math.min(1, d / 50, (L - d) / 90) * Math.sin((x0 - pose.x + d) * freq + t * flow + ph);
        xs[i] = lerp(x0 + xs[i] * pose.R, x0 + d, open);
        ys[i] = lerp(pose.y + ys[i] * pose.R, y, open);
      }
    } else {
      // Every particle somewhere of its own, so they fly in separately rather than as strands
      for (let i = 0; i < SAMPLES; i++) {
        const d = k * SAMPLES + i;
        const a = rand(d, 61) * TAU;
        const dist = Math.max(vw, vh) * (0.3 + 0.7 * rand(d, 62));
        xs[i] = vw / 2 + Math.cos(a) * dist;
        ys[i] = vh / 2 + Math.sin(a) * dist;
      }
    }
  }

  // The demo's stage and the halo's spot above its prompt, on screen
  function liveRects(stage) {
    const box = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, w: b.width, h: b.height };
    };
    return { S: box(stage), dock: box(dock) };
  }

  const LIVE_SPEED = [HERO_SPEED, 2.2, 1.6, HERO_SPEED];

  // The halo only shows on the demo's first step. It gathers from the particles as the demo comes up
  // the screen, or over the step's start when the demo has come back round to it, and breaks back
  // into particles flying off as the next step opens the app (leaving: just come from step 1)
  function liveSegment(live, r) {
    const halo = { type: 'halo', x: r.dock.x + r.dock.w / 2, y: r.dock.y + r.dock.h / 2, R: (r.dock.h / 2) * 0.84 };
    let k;
    if (live.step === 0) k = live.looped ? clamp(live.local / 0.35) : live.gather;
    else if (live.leaving) k = 1 - clamp(live.local / 0.3);
    else return null;
    return k > 0 ? { from: { type: 'scatter' }, to: halo, k, stagger: true } : null;
  }

  // The features' progress line (scripts.njk): the particles gather into a small ring at its start
  // as it comes up the screen, then run out along it as the rail slides across. Past the last card
  // the tail runs up the line after them over the next quarter screen of scrolling, until they're
  // wound into a ring at its tip, which then bursts into particles flying apart over most of a
  // screen more (burst), as the orb did, slowly, so the particles are around for a while
  const TAIL_RUN = 0.27;
  const BURST_START = 0.24;
  const BURST_RUN = 0.9;
  function featureSegment(f, vh) {
    if (!f.state.on || f.state.gather <= 0) return null;
    const past = f.state.past;
    const burst = clamp((past - vh * BURST_START) / (vh * BURST_RUN));
    const b = f.line.getBoundingClientRect();
    if (b.top > vh * 2 || (b.bottom < -vh * 0.5 && burst === 0)) return null;
    const R = b.height * 0.45;
    const tail = easeInOut(clamp(past / (vh * TAIL_RUN)));
    const wave = { type: 'wave', x: b.left + R, y: b.top + b.height / 2, w: b.width - R, p: f.state.progress, tail, R, A: b.height * 0.5 };
    return { from: { type: 'scatter' }, to: wave, k: f.state.gather, steady: true, alpha: 1 - clamp(burst / 0.15), burst };
  }

  // The hero halo is sketched in as the page loads, once the intro has played (intro.js), or straight
  // away without it: its strands draw themselves one after another like pen strokes round the circle
  // (heroSketch, 0 → 1 over SKETCH_TIME seconds)
  const SKETCH_TIME = 3.6;
  let heroSketch = reduced ? 1 : 0;
  let heroSketching = false;
  if (!reduced) {
    if (root.classList.contains('has-intro')) document.addEventListener('tinker:intro-done', () => { heroSketching = true; }, { once: true });
    else heroSketching = true;
  }

  // The colour of the card the rail has come to, blending into the next: the cards take the step
  // colours in turn
  function featureColor(p, cards) {
    const at = p * (cards - 1);
    const i = Math.floor(at);
    const a = colors.steps[i % 4];
    const b = colors.steps[(i + 1) % 4];
    const c = a.map((v, j) => Math.round(lerp(v, b[j], easeInOut(at - i))));
    return `rgb(${c.join(',')})`;
  }

  // Each particle's flight when the orb explodes: direction, distance and a little stagger
  const DOTS = Math.ceil(SAMPLES / DOT_STEP);
  const burstAngle = Array.from({ length: COUNT * DOTS }, (_, i) => rand(i, 2) * TAU);
  const burstReach = Array.from({ length: COUNT * DOTS }, (_, i) => 0.25 + rand(i, 3) * 0.5);
  const burstDelay = Array.from({ length: COUNT * DOTS }, (_, i) => rand(i, 7) * 0.3);

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

  const toRgb = (c) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
    const n = m ? parseInt(m[1], 16) : 0x7590ff;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  function readColors() {
    const cs = getComputedStyle(root);
    colors = {
      ink: cs.getPropertyValue('--ink').trim() || '#121212',
      // Meet Tinker's step colours, as RGB so the halo can blend from one to the next
      steps: [1, 2, 3, 4].map((i) => toRgb(cs.getPropertyValue(`--node-${i}`))),
      bg: cs.getPropertyValue('--bg').trim() || '#eee9e2',
      accent: cs.getPropertyValue('--accent').trim() || '#2b4dff',
      // The magnified lines: Make it blue, Use it the logo mark's orange (as .text-orange), Share it green
      lens: [
        cs.getPropertyValue('--accent').trim() || '#2b4dff',
        '#ff5f00',
        cs.getPropertyValue('--node-4').trim() || '#0f9f72'
      ],
      // Light strands on a dark page add up where they cross; dark ones on a light page can't
      dark: darkQuery.matches
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

  let clock = 20; // start mid-motion so the strands are already spread around the ring
  let speed = HERO_SPEED;
  let rot = -1; // -1: the first line waiting off-screen to the right
  let lastY = window.scrollY;
  let lastNow = null;

  // drawOrb paints the strands between the big words and the lens backdrop, so the backdrop keeps
  // the window clean and the magnified words sit on top
  function drawWords(vw, vh, cy, R, cx, alpha, lensAlpha, drawOrb) {
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
    // color: one for every line, or a list with one per line
    const paint = (color) => {
      LINES.forEach((l, i) => {
        ctx.fillStyle = Array.isArray(color) ? color[i] : color;
        ctx.fillText(l[0] + l[1], vw / 2 + centres[i] - shift, cy + size * 0.04);
      });
    };

    ctx.globalAlpha = alpha;
    paint(colors.ink);

    drawOrb();

    // The lens: inside the orb the words are magnified and coloured, a colour for each line
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
    paint(colors.lens);
    ctx.restore();
  }

  // Scratch buffers for one strand in each look, and the blend of the two
  const rx = new Float32Array(SAMPLES);
  const ry = new Float32Array(SAMPLES);
  const ox = new Float32Array(SAMPLES);
  const oy = new Float32Array(SAMPLES);
  const xs = new Float32Array(SAMPLES);
  const ys = new Float32Array(SAMPLES);

  // m: 0 the hero ring → 1 the landed orbit. burst: 0 → 1 as the strands fly apart as particles
  function drawOrb(cx, cy, R, t, m, burst, reach, sketch) {
    const lineAlpha = 1 - clamp(burst / 0.15);
    const dotAlpha = clamp(burst / 0.15);
    const lineScale = Math.min(1.4, Math.max(0.7, R / 250));
    const dotScale = Math.min(1.3, Math.max(0.55, R / 200));

    // A soft glow behind the ring, on dark pages only
    if (colors.dark && lineAlpha > 0) {
      const halo = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.4);
      halo.addColorStop(0, 'rgba(255,255,255,0)');
      halo.addColorStop(lerp(0.5, 0.6, m), `rgba(255,255,255,${0.045 * lineAlpha})`);
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = halo;
      ctx.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);
    }

    ctx.globalCompositeOperation = colors.dark ? 'lighter' : 'source-over';
    ctx.strokeStyle = colors.ink;
    ctx.fillStyle = colors.ink;
    // Square ends: each strand is drawn in pieces, and round ends would overlap at every join
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    for (let k = 0; k < COUNT; k++) {
      const s = ring[k];
      if (m < 1) traceRing(s, t, rx, ry);
      if (m > 0) traceOrbit(k, s, t, ox, oy);
      for (let i = 0; i < SAMPLES; i++) {
        xs[i] = cx + lerp(rx[i], ox[i], m) * R;
        ys[i] = cy + lerp(ry[i], oy[i], m) * R;
      }

      // Being sketched in on load
      let last = SAMPLES - 1;
      let drawn = 1;
      if (sketch < 1) {
        const e = clamp(sketch * 2.2 - rand(k, 9) * 1.2);
        if (e <= 0) continue;
        last = Math.max(1, Math.round(easeInOut(e) * (SAMPLES - 1)));
        drawn = clamp(e * 4);
      }

      if (lineAlpha > 0) {
        const width = s.width * lineScale;
        ctx.lineWidth = width;
        let tipAlpha = 0;
        for (let c = 0; c < last; c += CHUNK - 1) {
          const end = Math.min(c + CHUNK - 1, last);
          const al = s.alpha * cometFade(((c + end) >> 1) / last) * lineAlpha * drawn;
          tipAlpha = al;
          if (al < 0.004) continue;
          ctx.globalAlpha = al;
          ctx.beginPath();
          ctx.moveTo(xs[c], ys[c]);
          for (let i = c + 1; i <= end; i++) ctx.lineTo(xs[i], ys[i]);
          ctx.stroke();
        }
        ctx.globalAlpha = tipAlpha;
        strandTip(xs[last - 1], ys[last - 1], xs[last], ys[last], width);
      }

      if (dotAlpha > 0) {
        for (let i = 0, d = k * DOTS; i < SAMPLES; i += DOT_STEP, d++) {
          const fade = cometFade(i / (SAMPLES - 1));
          const fly = easeInOut(clamp(burst * 1.3 - burstDelay[d]));
          const pa = Math.min(1, 0.25 + s.alpha) * (0.3 + 0.7 * fade) * dotAlpha * (1 - fly);
          if (pa < 0.01) continue;
          const dist = fly * reach * burstReach[d];
          const size = (0.8 + 1.4 * fade) * dotScale;
          ctx.globalAlpha = pa;
          ctx.fillRect(
            xs[i] + Math.cos(burstAngle[d]) * dist - size / 2,
            ys[i] + Math.sin(burstAngle[d]) * dist - size / 2,
            size, size
          );
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // The ring at the tip of the features' line breaking into particles that fly apart, as the orb's
  // strands do (burst 0 → 1); every other strand, for more particles than there were lines
  function drawBurst(cx, cy, R, t, burst, reach, color) {
    ctx.globalCompositeOperation = colors.dark ? 'lighter' : 'source-over';
    ctx.fillStyle = color;
    const dotAlpha = clamp(burst / 0.15);
    for (let k = 0; k < COUNT; k += 2) {
      const s = ring[k];
      traceRing(s, t, xs, ys);
      for (let i = 0, d = k * DOTS; i < SAMPLES; i += DOT_STEP, d++) {
        const fade = cometFade(i / (SAMPLES - 1));
        const fly = easeInOut(clamp(burst * 1.3 - burstDelay[d]));
        // Fading only toward the end of their flight, so they stay in view most of the way out
        const pa = Math.min(1, 0.5 + s.alpha) * (0.55 + 0.45 * fade) * dotAlpha * (1 - fly * fly * fly);
        if (pa < 0.01) continue;
        const dist = fly * reach * burstReach[d];
        const size = 1.3 + 1.7 * fade;
        ctx.globalAlpha = pa;
        ctx.fillRect(
          cx + xs[i] * R + Math.cos(burstAngle[d]) * dist - size / 2,
          cy + ys[i] * R + Math.sin(burstAngle[d]) * dist - size / 2,
          size, size
        );
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // The demo's strands, between two poses (seg from liveSegment); arriving from the scatter, or when
  // the segment says particles, they fly as particles that turn back into strands as they land.
  // lineScale sizes the lines running round the app's boxes
  function drawLive(seg, t, vw, vh, color, lineScale) {
    ctx.globalCompositeOperation = colors.dark ? 'lighter' : 'source-over';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    const scattered = seg.from.type === 'scatter';
    // Breaking strands into particles: each particle sets off on its own, so they stream across
    // separately instead of keeping their strand's shape, and the strands only re-form at the end
    const own = seg.particles;
    const arriving = scattered || own;
    // Lines, heads and particles sized as for the hero halo when they make up a (small) halo
    const R = (p) => (p.type === 'halo' ? p.R : p.type === 'halos' ? p.list[0].R : null);
    const lineOf = (p) => (R(p) ? Math.min(1.4, Math.max(0.7, R(p) / 250)) : lineScale);
    const dotOf = (p) => (R(p) ? Math.min(1.3, Math.max(0.55, R(p) / 200)) : 1);
    const lineFrom = lineOf(seg.from);
    const lineTo = lineOf(seg.to);
    const dotFrom = dotOf(seg.from);
    const dotTo = dotOf(seg.to);
    // Along the progress line the tails don't fade right out, so the line reads from its start
    const fade = seg.to.type === 'wave' ? (u) => 0.3 + 0.7 * cometFade(u) : cometFade;
    // ...and only some of the strands run along it, so the lines stay apart
    const every = seg.to.type === 'wave' ? WAVE_EVERY : 1;
    // The whole thing fading, as it gives way to particles
    const fadeAll = seg.alpha === undefined ? 1 : seg.alpha;

    for (let k = 0; k < COUNT; k += every) {
      if (every > 1 && k === WAVE_SKIP) continue;
      const s = ring[k];
      // Steady: at an even pace, staggered only a little, so they all land right at the end
      const mk = seg.steady ? clamp(seg.k * 1.12 - rand(k, 9) * 0.12)
        : seg.stagger ? easeInOut(clamp(seg.k * 1.35 - rand(k, 9) * 0.35)) : easeInOut(seg.k);
      if (scattered && mk <= 0) continue;
      if (mk < 1 || (own && seg.k < 1)) fillPose(seg.from, k, s, t, rx, ry, vw, vh);
      if (mk > 0 || own) fillPose(seg.to, k, s, t, ox, oy, vw, vh);
      // Arriving particles home in fast and then settle, so they sit on the halo before joining up
      // (steady ones only ease in gently, so they're still on their way in until the end)
      const mp = arriving ? 1 - Math.pow(1 - mk, seg.steady ? 1.6 : 3) : mk;
      for (let i = 0; i < SAMPLES; i++) {
        xs[i] = lerp(rx[i], ox[i], mp);
        ys[i] = lerp(ry[i], oy[i], mp);
      }
      // Straight flight: in mid-air the strand straightens into a streak running along the line
      // from its head's start to its head's landing spot, curling back into a loop as it lands
      if (seg.straight && mk > 0 && mk < 1) {
        const flight = clamp(Math.sin(PI * mk) * 2.5);
        const last = SAMPLES - 1;
        const tail = 0.12 + 0.1 * rand(k, 71); // streak length, as a share of the trip
        for (let i = 0; i < SAMPLES; i++) {
          const at = clamp(mk - tail * (1 - i / last));
          xs[i] = lerp(xs[i], lerp(rx[last], ox[last], at), flight);
          ys[i] = lerp(ys[i], lerp(ry[last], oy[last], at), flight);
        }
      }

      const join = seg.steady ? 0.96 : 0.9; // when the particles join up into strands
      const dots = arriving ? 1 - clamp(((own ? seg.k : mk) - join) / (1 - join)) : 0;
      const dotScale = lerp(dotFrom, dotTo, mk);
      if (dots < 1) {
        const width = s.width * lerp(lineFrom, lineTo, mk);
        ctx.lineWidth = width;
        let tipAlpha = 0;
        for (let c = 0; c < SAMPLES - 1; c += CHUNK - 1) {
          const end = Math.min(c + CHUNK - 1, SAMPLES - 1);
          const al = s.alpha * fade(((c + end) >> 1) / (SAMPLES - 1)) * (1 - dots) * fadeAll;
          tipAlpha = al;
          if (al < 0.004) continue;
          ctx.globalAlpha = al;
          ctx.beginPath();
          ctx.moveTo(xs[c], ys[c]);
          for (let i = c + 1; i <= end; i++) ctx.lineTo(xs[i], ys[i]);
          ctx.stroke();
        }
        ctx.globalAlpha = tipAlpha;
        strandTip(xs[SAMPLES - 2], ys[SAMPLES - 2], xs[SAMPLES - 1], ys[SAMPLES - 1], width);
      }
      if (dots > 0) {
        for (let i = 0; i < SAMPLES; i += DOT_STEP) {
          const f = fade(i / (SAMPLES - 1));
          // From the scatter they fade in early in their flight, so they show as they gather;
          // from strands on screen they're there already
          const pa = Math.min(1, 0.5 + s.alpha) * (0.55 + 0.45 * f) * dots * (scattered ? clamp(mk * 3) : 1) * fadeAll;
          if (pa < 0.01) continue;
          const size = (1.3 + 1.7 * f) * dotScale;
          let x = xs[i];
          let y = ys[i];
          if (own) {
            const mi = 1 - Math.pow(1 - easeInOut(clamp(seg.k * 1.6 - rand(k * SAMPLES + i, 9) * 0.6)), 3);
            x = lerp(rx[i], ox[i], mi);
            y = lerp(ry[i], oy[i], mi);
          }
          ctx.globalAlpha = pa;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const s = state.slotRect;
    const g = state.targetRect;
    if (!s || !g) return;

    const dt = lastNow === null ? 0 : Math.min((now - lastNow) / 1000, 0.1);
    if (heroSketching) heroSketch = Math.min(1, heroSketch + dt / SKETCH_TIME);
    const screensPerSec = dt ? Math.abs(window.scrollY - lastY) / window.innerHeight / dt : 0;
    lastNow = now;
    lastY = window.scrollY;

    const vw = canvas.clientWidth;
    const vh = canvas.clientHeight;

    // Meet Tinker: the demo's progress (scripts.njk) and where its strands are going, once the
    // particles have started gathering and while the demo is anywhere near the screen
    const live = window.TinkerLive;
    const gather = live && dock ? live.state.gather : 0;
    let liveRect = null;
    let seg = null;
    if (gather > 0) {
      liveRect = liveRects(live.stage);
      if (liveRect.S.y + liveRect.S.h > -vh && liveRect.S.y < vh * 4) seg = liveSegment(live.state, liveRect);
    }
    const liveStep = live ? live.state.step : 0;

    const q = state.flow;
    // The first line slides in as the orb lands, then the scroll steps through the lines
    const entry = easeInOut(clamp((state.morph - 0.75) / 0.25));
    const target = holdStep(clamp(q / LINES_END)) - (1 - entry);
    if (reduced) {
      rot = target;
    } else {
      const prevRot = rot;
      rot += (target - rot) * (1 - Math.exp(-dt * 5));
      const slide = dt ? Math.abs(rot - prevRot) / dt : 0; // lines per second

      // Clock: brisk in the hero, a slow drift once landed, then each demo step's pace once
      // gathered; scrolling (less so in the demo, where scrolling is how it moves on) and each line
      // sliding in push it faster, and it eases back once things are still
      const wantSpeed = lerp(lerp(HERO_SPEED, LANDED_SPEED, state.eased), LIVE_SPEED[liveStep], gather)
        + Math.min(10, screensPerSec * 16) * (1 - 0.7 * gather)
        + Math.min(6, slide * 8);
      speed += (wantSpeed - speed) * (1 - Math.exp(-dt * 3));
      clock += speed * dt;
    }

    const isCompact = api.stage.classList.contains('is-compact');
    if (canvas.width !== Math.round(vw * dpr) || canvas.height !== Math.round(vh * dpr)) resize();
    // Clear the whole buffer, not just the visible part, so nothing from an earlier frame lingers
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let cx;
    let cy;
    let R;
    let withPage = false;
    if (isCompact) {
      // Phones: same size throughout. Ride up with the page until reaching the spot it will
      // hold in the pinned stage, wait there while the hero scrolls out, then leave with the stage.
      const pinTop = pin.getBoundingClientRect().top;
      const targetCy = g.top + g.height / 2;
      const pinnedCy = targetCy - pinTop;
      const slotCy = s.top + s.height / 2;
      const holdCy = Math.min(pinnedCy, targetCy);
      cx = g.left + g.width / 2;
      cy = Math.max(slotCy, holdCy);
      R = (g.width / 2) * 0.84;
      withPage = slotCy > holdCy || targetCy < pinnedCy;
    } else {
      // Desktop: grow from the hero slot into the stage as the title docks
      const k = state.eased;
      cx = lerp(s.left + s.width / 2, g.left + g.width / 2, k);
      cy = lerp(s.top + s.height / 2, g.top + g.height / 2, k);
      R = lerp(s.width / 2, g.width / 2, k) * 0.84;
    }
    const reach = Math.max(vw, vh);
    const outro = clamp((q - LINES_END) / (1 - LINES_END));
    const burst = clamp((outro - 0.1) / 0.9);
    const textAlpha = 1 - clamp(outro / 0.3);

    // The orb (and, at the end, its particles flying apart). It moves out into the orbit on the way
    if (pinCanvas) prepare(pinCanvas, pinCtx, pinDrawn);
    pinDrawn = false;
    if (burst < 1 && cy + R > -vh && cy - R < vh * 2) {
      const orb = () => drawOrb(cx, cy, R, clock, state.eased, burst, reach, heroSketch);
      const draw = () => {
        if (entry > 0 && textAlpha > 0.001) drawWords(vw, vh, cy, R, cx, textAlpha, entry * (1 - burst), orb);
        else orb();
      };
      if (withPage && pinCanvas) {
        drawOn(pinCanvas, pinCtx, draw);
        pinDrawn = true;
      } else draw();
    }

    // Meet Tinker: the particles gathering into the halo above the prompt, in the first step's colour,
    // and flying off again as the app opens. Drawn in screen pixels like everything else, shifted onto
    // the demo's canvas by where it sits on screen right now. While they gather they fly in from all
    // over the screen, from before the demo (still to fade in, canvas and all) is on it, so they're
    // drawn on the fixed canvas until the halo has formed
    if (liveCanvas) {
      prepare(liveCanvas, liveCtx, liveDrawn);
      liveDrawn = false;
    }
    if (seg) {
      const draw = () => drawLive(seg, clock, vw, vh, `rgb(${colors.steps[0].join(',')})`, Math.min(1.2, Math.max(0.7, liveRect.S.h / 500)));
      if (liveCanvas && gather >= 1) {
        drawOn(liveCanvas, liveCtx, draw);
        liveDrawn = true;
      } else draw();
    }

    // Features: the strands along the progress line, on the fixed canvas (wider screens only, where
    // the rail holds still on screen while they grow)
    const feat = window.TinkerFeatures;
    const featSeg = feat ? featureSegment(feat, vh) : null;
    if (featSeg) {
      const color = featureColor(feat.state.progress, feat.cards);
      if (featSeg.alpha > 0) drawLive(featSeg, clock, vw, vh, color, 0.8);
      if (featSeg.burst > 0 && featSeg.burst < 1) {
        const w = featSeg.to;
        drawBurst(w.x + w.w, w.y, w.R, clock, featSeg.burst, Math.max(vw, vh), color);
      }
    }
  }

  readColors();
  resize();
  darkQuery.addEventListener('change', readColors);
  window.addEventListener('resize', resize);
  api.on((s) => { state = s; });
  canvas.classList.add('is-ready');
  if (pinCanvas) pinCanvas.classList.add('is-ready');
  requestAnimationFrame(frame);
})();
