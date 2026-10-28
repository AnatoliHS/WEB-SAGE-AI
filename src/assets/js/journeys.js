// Journeys (trial, concepts/journeys.njk): five whole openings, each a loading screen
// (intros/<name>.js), a hero and a transition into the next section. This is the hero and the
// transition, picked by html[data-journey] (the page's journey):
//   eclipse   a ringed eclipse behind the wordmark, its corona brightest towards the pointer; on
//             scroll the light floods out of it: a disc of paper widens from the middle
//   ripple    dark water that the pointer (and the odd drop) ripples; on scroll the paper rises
//             as a wave, its crest lit violet
//   terminal  a grid of points, lit by the pointer and by a slow scan line; on scroll the hero
//             breaks into tiles that flip to paper, a glitch of violet at the edge
//   aurora    curtains of light over a centred hero, bending towards the pointer; on scroll a dawn
//             of paper rises, a band of light on its edge
//   horizon   the star field again, drifting out of the horizon and leaning with the pointer; on
//             scroll a planet of paper rises, its atmosphere glowing
// The hero is drawn behind the copy (the first screen); the transition over it (the whole hero,
// which runs half a screen longer for it), and it moves with the scroll, not the clock.
(() => {
  const root = document.documentElement;
  const name = root.dataset.journey;
  const hero = document.getElementById('hero');
  if (!name || !hero) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = getComputedStyle(hero);
  const trip = (n, fb) => (css.getPropertyValue(n).trim() || fb).split(',').map(Number);
  const G1 = trip('--ground-1', '24, 18, 44'), G3 = trip('--ground-3', '6, 5, 12');
  const LENS = trip('--lens', '110, 50, 255'), GLOW = trip('--glow', '151, 26, 255');
  const INK = [241, 238, 250];
  const A1 = [48, 42, 255], A2 = [151, 26, 255];
  const PAPER = (() => {
    const probe = document.createElement('i');
    probe.style.color = 'var(--bg)';
    document.body.append(probe);
    const c = getComputedStyle(probe).color.match(/[\d.]+/g).slice(0, 3).map(Number);
    probe.remove();
    return c;
  })();
  const rgba = (c, a = 1) => `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${a})`;
  const mix = (a, b, k) => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * k);
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (k) => k * k * (3 - 2 * k);
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const make = (cls) => {
    const el = document.createElement('canvas');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    return { el, g: el.getContext('2d') };
  };
  const back = make('jy-back');
  const front = make('jy-front');
  hero.prepend(back.el);
  hero.append(front.el);

  // Sizes: W wide; VH the first screen (the hero behind the copy); HH the whole hero
  let W = 0, VH = 0, HH = 0;

  // The pointer over the hero, smoothed, and how fast it's going
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, vx: 0, vy: 0, at: 0, has: false };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now();
    if (ptr.at && now - ptr.at < 200) {
      const dt = Math.max(8, now - ptr.at) / 1000;
      ptr.vx += ((x - ptr.x) / dt - ptr.vx) * 0.5;
      ptr.vy += ((y - ptr.y) / dt - ptr.vy) * 0.5;
    }
    if (!ptr.has) { ptr.sx = x; ptr.sy = y; }
    ptr.x = x; ptr.y = y; ptr.at = now; ptr.has = true;
  }, { passive: true });

  // ---- The five -----------------------------------------------------------------------------------
  const J = {
    eclipse: () => {
      const geo = () => ({ cx: W / 2, cy: VH * 0.45, r: Math.min(W, VH) * (W < 700 ? 0.34 : 0.26) });
      const ang = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
      return {
        back(g, t) {
          const { cx, cy, r } = geo();
          g.clearRect(0, 0, W, VH);
          const haze = g.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 2.6);
          haze.addColorStop(0, rgba(GLOW, 0.22));
          haze.addColorStop(1, rgba(GLOW, 0));
          g.fillStyle = haze;
          g.fillRect(0, 0, W, VH);
          // The corona: brightest where it faces the pointer, or turning slowly without one
          const face = ptr.has ? Math.atan2(ptr.sy - cy, ptr.sx - cx) : t * 0.22 + 1.6;
          g.globalCompositeOperation = 'lighter';
          g.lineCap = 'round';
          for (let i = 0; i < 240; i++) {
            const a = (i / 240) * Math.PI * 2;
            const d = ang(a, face);
            const k = 0.32 + 0.2 * Math.sin(a * 5 + t * 0.6) + 0.16 * Math.sin(a * 11 - t * 0.9 + 2) + 0.95 * Math.exp(-d * d * 5);
            const c = mix(A1, A2, (Math.sin(a * 2 + t * 0.3) + 1) / 2);
            g.strokeStyle = rgba(c, 0.08 + 0.22 * k);
            g.lineWidth = 2.2;
            g.beginPath();
            g.moveTo(cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r * 0.98);
            g.lineTo(cx + Math.cos(a) * r * (1 + 0.3 * k), cy + Math.sin(a) * r * (1 + 0.3 * k));
            g.stroke();
          }
          // The diamond, on the ring where it faces
          const dx = cx + Math.cos(face) * r, dy = cy + Math.sin(face) * r;
          const dia = g.createRadialGradient(dx, dy, 0, dx, dy, 42);
          dia.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
          dia.addColorStop(0.3, rgba(GLOW, 0.5));
          dia.addColorStop(1, rgba(GLOW, 0));
          g.fillStyle = dia;
          g.fillRect(dx - 44, dy - 44, 88, 88);
          g.globalCompositeOperation = 'source-over';
          // The ring, and the moon inside it
          g.save();
          g.shadowColor = rgba(GLOW, 0.9);
          g.shadowBlur = 22;
          g.strokeStyle = 'rgba(232, 222, 255, 0.85)';
          g.lineWidth = 1.6;
          g.beginPath();
          g.arc(cx, cy, r, 0, Math.PI * 2);
          g.stroke();
          g.restore();
          const moon = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
          moon.addColorStop(0, rgba(mix(G1, G3, 0.3)));
          moon.addColorStop(1, rgba(G3));
          g.fillStyle = moon;
          g.beginPath();
          g.arc(cx, cy, r * 0.985, 0, Math.PI * 2);
          g.fill();
        },
        // The light floods out: a disc of paper widening from the eclipse, its rim lit
        front(g, p) {
          const { cx, cy } = geo();
          const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, HH - cy)) * 1.04 * smooth(p);
          const halo = g.createRadialGradient(cx, cy, R, cx, cy, R + 120);
          halo.addColorStop(0, rgba(GLOW, 0.55));
          halo.addColorStop(1, rgba(GLOW, 0));
          g.fillStyle = halo;
          g.fillRect(0, 0, W, HH);
          g.fillStyle = rgba(PAPER);
          g.beginPath();
          g.arc(cx, cy, R, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          g.lineWidth = 2;
          g.stroke();
        },
      };
    },

    ripple: () => {
      // A wave simulation on a coarse grid, drawn small and stretched
      const cell = W < 700 ? 4 : 5;
      const gw = Math.ceil(W / cell), gh = Math.ceil(VH / cell);
      back.el.width = gw;
      back.el.height = gh;
      let cur = new Float32Array(gw * gh), prev = new Float32Array(gw * gh);
      const img = back.g.createImageData(gw, gh);
      const px = new Uint32Array(img.data.buffer);
      // The still water's colour at each cell, lighter towards the middle
      const base = new Float32Array(gw * gh * 3);
      const fade = new Float32Array(gh);
      for (let y = 0; y < gh; y++) {
        fade[y] = Math.min(1, (gh - y) / (gh * 0.18), y / (gh * 0.06));
        for (let x = 0; x < gw; x++) {
          const k = clamp01(Math.hypot((x / gw - 0.5) * 1.2, y / gh - 0.47) * 1.5);
          const c = mix(G1, G3, k);
          base.set(c, (y * gw + x) * 3);
        }
      }
      const drop = (gx, gy, amp, rad = 2) => {
        for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
          const i = (gy + y) * gw + gx + x;
          if (gx + x > 0 && gx + x < gw - 1 && gy + y > 0 && gy + y < gh - 1) cur[i] -= amp * (1 - Math.hypot(x, y) / (rad + 1));
        }
      };
      let nextDrop = 0;
      return {
        own: true,
        back(g, t) {
          if (t > nextDrop) { drop(2 + Math.floor(rnd() * (gw - 4)), 2 + Math.floor(rnd() * (gh * 0.8)), 160); nextDrop = t + 0.6 + rnd() * 1.1; }
          if (performance.now() - ptr.at < 120) {
            const sp = Math.min(Math.hypot(ptr.vx, ptr.vy), 2000);
            drop(Math.round(ptr.x / cell), Math.round(ptr.y / cell), Math.min(90, 18 + sp * 0.04), 2);
          }
          for (let step = 0; step < 2; step++) {
            for (let y = 1; y < gh - 1; y++) {
              for (let x = 1, i = y * gw + 1; x < gw - 1; x++, i++) {
                prev[i] = ((cur[i - 1] + cur[i + 1] + cur[i - gw] + cur[i + gw]) / 2 - prev[i]) * 0.986;
              }
            }
            const tmp = cur; cur = prev; prev = tmp;
          }
          for (let y = 1; y < gh - 1; y++) {
            for (let x = 1, i = y * gw + 1; x < gw - 1; x++, i++) {
              // Lit from the top left: the slope of the water, and a highlight on the steepest
              const L = ((cur[i + 1] - cur[i - 1]) * 0.5 + (cur[i + gw] - cur[i - gw]) * 0.8) * fade[y] * 1.35;
              const hi = Math.max(0, L - 10) * 1.4;
              const b = i * 3;
              const r = base[b] + L * LENS[0] / 255 * 1.1 + hi * GLOW[0] / 255;
              const gg = base[b + 1] + L * LENS[1] / 255 * 1.1 + hi * GLOW[1] / 255;
              const bb = base[b + 2] + L * LENS[2] / 255 * 1.1 + hi * GLOW[2] / 255;
              px[i] = (255 << 24) | (Math.max(0, Math.min(255, bb)) << 16) | (Math.max(0, Math.min(255, gg)) << 8) | Math.max(0, Math.min(255, r));
            }
          }
          g.putImageData(img, 0, 0);
        },
        // The paper rises as a wave, a lit crest along it, a paler swell behind
        animated: true,
        front(g, p, t) {
          const yb = HH + 50 - p * (HH + 130);
          const wave = (f1, f2, s1, s2, a1, a2, off) => {
            g.beginPath();
            g.moveTo(0, HH + 10);
            for (let x = 0; x <= W + 10; x += 10) g.lineTo(x, yb + off + Math.sin(x * f1 + t * s1) * a1 + Math.sin(x * f2 - t * s2) * a2);
            g.lineTo(W, HH + 10);
            g.closePath();
          };
          wave(0.006, 0.013, -1.1, 0.8, 26, 12, -34);
          g.fillStyle = rgba(PAPER, 0.4);
          g.fill();
          wave(0.008, 0.017, 1.6, 2.3, 22, 10, 0);
          g.fillStyle = rgba(PAPER);
          g.fill();
          g.save();
          g.shadowColor = rgba(GLOW, 0.9);
          g.shadowBlur = 16;
          g.strokeStyle = rgba(mix(GLOW, [255, 255, 255], 0.4), 0.8);
          g.lineWidth = 2;
          g.stroke();
          g.restore();
        },
      };
    },

    terminal: () => {
      const gap = W < 700 ? 18 : 24;
      const tile = W < 700 ? 18 : 28;
      const cols = Math.ceil(W / tile), rows = Math.ceil(HH / tile);
      seed = 5;
      const tr = Float32Array.from({ length: cols * rows }, () => rnd());
      const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5; return h - Math.floor(h); };
      const pad = (n) => String(n).padStart(2, '0');
      return {
        back(g, t) {
          g.clearRect(0, 0, W, VH);
          const scan = ((t * 0.2) % 1.3) * VH;
          const lights = [];
          g.fillStyle = rgba(INK);
          for (let y = gap / 2; y < VH; y += gap) {
            for (let x = gap / 2; x < W; x += gap) {
              const near = ptr.has ? Math.exp(-(((x - ptr.sx) ** 2 + (y - ptr.sy) ** 2) / (200 * 200))) : 0;
              const sweep = Math.exp(-(((y - scan) / 36) ** 2));
              const h = hash(x, y);
              const blink = h < 0.012 ? Math.max(0, Math.sin(t * 1.7 + h * 900)) : 0;
              const l = Math.max(near, sweep * 0.8, blink);
              g.globalAlpha = 0.07 + 0.35 * l;
              g.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
              if (l > 0.35) lights.push(x, y, l);
            }
          }
          // The lit ones glow violet
          g.globalCompositeOperation = 'lighter';
          g.fillStyle = rgba(GLOW);
          for (let i = 0; i < lights.length; i += 3) {
            g.globalAlpha = (lights[i + 2] - 0.3) * 0.9;
            g.fillRect(lights[i] - 1.5, lights[i + 1] - 1.5, 3, 3);
          }
          g.globalCompositeOperation = 'source-over';
          g.globalAlpha = 1;
          // A status line in each bottom corner
          g.font = '500 11px ui-monospace, SFMono-Regular, Menlo, monospace';
          g.fillStyle = rgba(INK, 0.36);
          const m = W < 700 ? 16 : Math.max(16, (W - Math.min(W, 1440)) / 2 + 40);
          g.textAlign = 'left';
          g.fillText('SAGE · OPEN SOURCE · PRIVATE BY DESIGN', m, VH - 28);
          g.textAlign = 'right';
          const s = Math.floor(t);
          g.fillText(`SESSION ${pad(Math.floor(s / 60))}:${pad(s % 60)}`, W - m, VH - 28);
        },
        // The hero breaks up into tiles that flip to paper, from the bottom, a glitch of violet at
        // the edge
        front(g, p) {
          const q = p * 1.1;
          const paper = new Path2D(), blue = new Path2D(), violet = new Path2D();
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const k = tr[r * cols + c];
              const th = (1 - (r + 0.5) / rows) * 0.74 + k * 0.26;
              if (q > th) paper.rect(c * tile, r * tile, tile, tile);
              else if (q > th - 0.045) (k < 0.5 ? blue : violet).rect(c * tile, r * tile, tile, tile);
            }
          }
          g.fillStyle = rgba(PAPER);
          g.fill(paper);
          g.fillStyle = rgba(A1, 0.9);
          g.fill(blue);
          g.fillStyle = rgba(A2, 0.9);
          g.fill(violet);
        },
      };
    },

    aurora: () => {
      const scale = 0.25;
      back.el.width = Math.ceil(W * scale);
      back.el.height = Math.ceil(VH * scale);
      back.g.setTransform(scale, 0, 0, scale, 0, 0);
      const ribbons = [
        { c: A1, y: 0.2, h: 0.26, f1: 0.0032, f2: 0.0081, s1: 0.35, s2: 0.5, a: 0.05 },
        { c: A2, y: 0.28, h: 0.22, f1: 0.0027, f2: 0.0066, s1: -0.3, s2: 0.45, a: 0.045 },
        { c: [90, 160, 255], y: 0.15, h: 0.18, f1: 0.0041, f2: 0.0094, s1: 0.45, s2: -0.35, a: 0.04 },
        { c: [210, 110, 255], y: 0.33, h: 0.16, f1: 0.0036, f2: 0.0072, s1: -0.4, s2: 0.35, a: 0.04 },
      ];
      return {
        own: true,
        back(g, t) {
          g.clearRect(0, 0, W, VH);
          g.globalCompositeOperation = 'lighter';
          ribbons.forEach((r, i) => {
            const h = r.h * VH;
            for (let x = 0; x < W; x += 8) {
              let y = r.y * VH + Math.sin(x * r.f1 + t * r.s1 + i) * VH * r.a + Math.sin(x * r.f2 - t * r.s2 + i * 2) * VH * r.a * 0.5;
              // Leaning towards the pointer where it is
              if (ptr.has) y += Math.exp(-(((x - ptr.sx) / 260) ** 2)) * (ptr.sy - y) * 0.22;
              const glow = 0.45 + 0.55 * Math.sin(x * 0.004 + t * 0.4 + i) ** 2;
              const col = g.createLinearGradient(0, y - h, 0, y);
              col.addColorStop(0, rgba(r.c, 0));
              col.addColorStop(0.75, rgba(r.c, 0.3 * glow));
              col.addColorStop(1, rgba(r.c, 0.7 * glow));
              g.fillStyle = col;
              g.fillRect(x, y - h, 8, h);
            }
          });
          g.globalCompositeOperation = 'source-over';
        },
        // Dawn: the paper rises with a long soft edge, a band of light along it
        front(g, p) {
          const edge = HH * 1.02 - p * (HH * 1.02 + 80);
          const wash = g.createLinearGradient(0, edge - 420, 0, edge);
          wash.addColorStop(0, rgba(PAPER, 0));
          wash.addColorStop(0.7, rgba(PAPER, 0.7));
          wash.addColorStop(1, rgba(PAPER));
          g.fillStyle = wash;
          g.fillRect(0, edge - 420, W, 420);
          g.fillStyle = rgba(PAPER);
          g.fillRect(0, edge, W, HH - edge + 10);
          const band = g.createLinearGradient(0, edge - 260, 0, edge - 40);
          band.addColorStop(0, rgba(LENS, 0));
          band.addColorStop(0.6, rgba(GLOW, 0.28));
          band.addColorStop(1, rgba(LENS, 0));
          g.globalCompositeOperation = 'lighter';
          g.fillStyle = band;
          g.fillRect(0, edge - 260, W, 220);
          g.globalCompositeOperation = 'source-over';
        },
      };
    },

    horizon: () => {
      const field = window.SageStarfield ? SageStarfield.create(W, VH) : null;
      return {
        back(g, t, dt) {
          g.clearRect(0, 0, W, VH);
          if (!field) return;
          // The horizon leans with the pointer, as if you were looking round
          const ox = ptr.has ? (ptr.sx - W / 2) * -0.06 : Math.sin(t * 0.2) * 18;
          const oy = ptr.has ? (ptr.sy - VH / 2) * -0.06 : Math.cos(t * 0.17) * 10;
          field.draw(g, t * 1000, dt, { cx: W / 2 + ox, cy: VH * 0.5 + oy, speed: 0.3, gap: 0, band: 1, alpha: 0.85 });
        },
        // A planet of paper rises, its atmosphere glowing
        front(g, p) {
          const R = W * 1.5;
          const top = Math.sqrt(R * R - (W / 2) ** 2);
          const cy = lerp(HH + R + 30, top - 6, smooth(p));
          const cx = W / 2;
          g.globalCompositeOperation = 'lighter';
          const air = g.createRadialGradient(cx, cy, R, cx, cy, R + 160);
          air.addColorStop(0, rgba(mix(GLOW, [255, 255, 255], 0.3), 0.6));
          air.addColorStop(0.3, rgba(LENS, 0.28));
          air.addColorStop(1, rgba(LENS, 0));
          g.fillStyle = air;
          g.fillRect(0, Math.max(0, cy - R - 170), W, HH);
          g.globalCompositeOperation = 'source-over';
          g.fillStyle = rgba(PAPER);
          g.beginPath();
          g.arc(cx, cy, R, 0, Math.PI * 2);
          g.fill();
          // A tint of the atmosphere just inside the rim
          const limb = g.createRadialGradient(cx, cy, R - 70, cx, cy, R);
          limb.addColorStop(0, rgba(LENS, 0));
          limb.addColorStop(1, rgba(LENS, 0.3));
          g.fillStyle = limb;
          g.fill();
          g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          g.lineWidth = 1.5;
          g.stroke();
        },
      };
    },
  };

  // ---- Running it ---------------------------------------------------------------------------------
  let run = null;
  // How far through the transition: from just after the scroll starts to when the hero's bottom is
  // half a screen up
  const progress = () => {
    const vh = window.innerHeight;
    return clamp01((-hero.getBoundingClientRect().top - vh * 0.08) / (HH - vh * 0.5));
  };
  // The header turns to paper once the paper has taken most of the hero (scripts.njk)
  window.SageHeroPaperTop = () => (progress() >= 0.75 ? -1 : hero.getBoundingClientRect().bottom);

  function size() {
    W = hero.clientWidth;
    HH = hero.offsetHeight;
    VH = Math.min(window.innerHeight, HH);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    back.el.width = Math.round(W * dpr);
    back.el.height = Math.round(VH * dpr);
    back.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    back.el.style.height = `${VH}px`;
    front.el.width = W;
    front.el.height = HH;
    run = J[name] ? J[name]() : null;
    lastP = -1;
  }

  let start = 0, last = 0, lastP = -1;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!run || !start || document.hidden) { last = now; return; }
    if (hero.getBoundingClientRect().bottom < 0) { last = now; return; }
    const t = reduced ? 4 : (now - start) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // The pointer, eased
    const k = 1 - Math.pow(0.002, dt);
    ptr.sx += (ptr.x - ptr.sx) * k;
    ptr.sy += (ptr.y - ptr.sy) * k;
    ptr.vx *= Math.pow(0.02, dt);
    ptr.vy *= Math.pow(0.02, dt);
    const p = progress();
    if (p < 0.999 && (!reduced || !back.drawn)) { run.back(back.g, t, dt); back.drawn = true; }
    if (p !== lastP || (run.animated && p > 0 && p < 1)) {
      front.g.clearRect(0, 0, W, HH);
      if (p > 0) run.front(front.g, p, t);
      lastP = p;
    }
  }

  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 200); });
  size();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
  const begin = () => { start = performance.now(); };
  if (root.classList.contains('has-intro')) document.addEventListener('tinker:intro-done', begin, { once: true });
  else begin();
  requestAnimationFrame(frame);
})();
