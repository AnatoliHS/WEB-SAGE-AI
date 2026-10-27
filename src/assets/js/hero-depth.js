// Hero depth (trial): a forest drawn in layers behind the hero, moving at different speeds as you
// scroll (near leaves faster, far trees slower), and a transition into the paper section below it,
// after Ironhill (ironhill.au). Picked by html[data-hero-depth] (head.njk: the page's heroDepth, or
// ?depth=<name>), one of:
//   edges       the homepage's: sage foliage in the hero's dark edges and corners, growing in from
//               the sides once the intro lands and parting out to them as you scroll
//   canopy      leafy clusters at three depths, paper rising as mist, branches hanging over it
//   sprigs      sage sprigs hanging from the top, a soft fog rising
//   fieldguide  line-drawn sprigs, and the next section as a torn page laid over the forest
//   clearing    two masses of foliage that part as you scroll, into a clearing
//   treeline    ridges of tree crowns fading into the distance, paper rising as mist
// Everything is drawn once (again on resize) onto canvases; scrolling only moves them.
(() => {
  const root = document.documentElement;
  const variant = root.dataset.heroDepth;
  const hero = document.getElementById('hero');
  const next = hero && hero.nextElementSibling;
  if (!variant || !hero || !next) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PAPER = '#f4eddd';
  // How far the transition layers reach up out of the next section into the hero
  const REACH = 340;
  // How far below the hero the rising paper starts, how much faster than the page it rises, and
  // how far it goes
  const DROP = 200, RISE_SPEED = 1.6, RISE_MAX = DROP + REACH * 0.5;

  // Seeded, so each variant draws the same forest on every load
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const range = (a, b) => a + rnd() * (b - a);

  // Leaf tones, by depth
  const TONES = {
    far: ['#27331f', '#2b3823', '#25301d'],
    mid: ['#2e3d25', '#35472b', '#29371f', '#3c4f30'],
    near: ['#111a0c', '#15200f', '#1a2512', '#0e150a', '#1f2b16'],
    sage: ['#4f6340', '#5d7149', '#6b7f55'],
  };

  // ---- Drawing --------------------------------------------------------------------------------

  // A sage leaf at the origin, pointing along +x
  function leafPath(g, len, wid) {
    g.moveTo(0, 0);
    g.bezierCurveTo(len * 0.25, -wid, len * 0.72, -wid * 0.85, len, 0);
    g.bezierCurveTo(len * 0.72, wid * 0.85, len * 0.25, wid, 0, 0);
  }

  // A sprig: a stem that bends towards `toward` (an angle) as it goes, with leaves in pairs along it,
  // smaller towards the tip, and the odd side sprig. o: { leaf, wide, fills, stem, stemW, pull,
  // toward, branch, line (stroke the leaves instead of filling them), rib (midrib colour) }
  function sprig(g, x, y, ang, len, o, depth = 0) {
    const steps = Math.max(4, Math.round(len / (o.leaf * 0.5)));
    const pts = [];
    let a = ang;
    for (let i = 0; i <= steps; i++) {
      pts.push([x, y, a]);
      let d = (o.toward ?? a) - a;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      a += d * (o.pull || 0) + (rnd() - 0.5) * 0.18;
      x += Math.cos(a) * (len / steps);
      y += Math.sin(a) * (len / steps);
    }
    g.strokeStyle = o.stem;
    g.lineWidth = o.stemW * (depth ? 0.6 : 1);
    g.beginPath();
    pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.stroke();

    pts.forEach(([px, py, pa], i) => {
      if (!i) return;
      const k = i / steps;
      const size = o.leaf * (1.05 - k * 0.55) * range(0.8, 1.2) * (depth ? 0.8 : 1);
      [-1, 1].forEach((side) => {
        g.save();
        g.translate(px, py);
        g.rotate(pa + side * range(0.45, 1.05));
        g.beginPath();
        leafPath(g, size, size * o.wide);
        if (o.line) {
          g.strokeStyle = o.line;
          g.lineWidth = o.lineW || 1;
          g.stroke();
        } else {
          g.fillStyle = pick(o.fills);
          g.fill();
        }
        if (o.rib) {
          g.strokeStyle = o.rib;
          g.lineWidth = 0.7;
          g.beginPath();
          g.moveTo(size * 0.06, 0);
          g.lineTo(size * 0.85, 0);
          g.stroke();
        }
        g.restore();
      });
      if (depth < 1 && k > 0.15 && k < 0.75 && rnd() < (o.branch ?? 0.18)) {
        sprig(g, px, py, pa + (rnd() < 0.5 ? -1 : 1) * range(0.5, 1), len * range(0.3, 0.5) * (1 - k), o, depth + 1);
      }
    });
    // A leaf at the tip
    const [tx, ty, ta] = pts[pts.length - 1];
    g.save();
    g.translate(tx, ty);
    g.rotate(ta);
    g.beginPath();
    leafPath(g, o.leaf * 0.6, o.leaf * 0.6 * o.wide);
    if (o.line) { g.strokeStyle = o.line; g.stroke(); } else { g.fillStyle = pick(o.fills); g.fill(); }
    g.restore();
  }

  // A leafy mass: many sprigs fanning out from one point
  function cluster(g, x, y, r, o, { count, from = 0, spread = Math.PI * 2 } = {}) {
    const n = count || Math.round(r / 5);
    for (let i = 0; i < n; i++) {
      const a = from + (rnd() - 0.5) * spread;
      const d = rnd() * r * 0.35;
      sprig(g, x + Math.cos(a) * d, y + Math.sin(a) * d, a, r * range(0.45, 1), { ...o, toward: o.toward ?? a });
    }
  }

  // Tree trunks in the distance, with a haze over them
  function trunks(g, w, h, n, color) {
    for (let i = 0; i < n; i++) {
      const x = range(-0.05, 1.05) * w;
      const tw = range(10, 34) * (w / 1440);
      g.fillStyle = color;
      g.globalAlpha = range(0.35, 0.8);
      g.beginPath();
      g.moveTo(x - tw / 2, h);
      g.quadraticCurveTo(x - tw * 0.3 + range(-20, 20), h * 0.5, x - tw * 0.25, -10);
      g.lineTo(x + tw * 0.25, -10);
      g.quadraticCurveTo(x + tw * 0.3 + range(-20, 20), h * 0.5, x + tw / 2, h);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  function haze(g, w, h, from, alpha) {
    const grad = g.createLinearGradient(0, h * from, 0, h);
    grad.addColorStop(0, 'rgba(207, 208, 192, 0)');
    grad.addColorStop(1, `rgba(207, 208, 192, ${alpha})`);
    g.fillStyle = grad;
    g.fillRect(0, h * from, w, h * (1 - from));
  }

  // A ridge of tree crowns along y = top (± rough), filled to the bottom
  function ridge(g, w, h, top, rough, size, color, pines = 0) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = -size; x < w + size; x += size * range(0.45, 0.8)) {
      const y = top + Math.sin(x * 0.004 + seed % 7) * rough + range(-0.4, 0.4) * rough;
      if (rnd() < pines) {
        // A conifer: a tall, stepped point
        const ph = size * range(2, 3.2);
        g.lineTo(x - size * 0.5, y);
        for (let s = 0; s < 4; s++) {
          const k = s / 4;
          g.lineTo(x - size * 0.5 * (1 - k) + size * 0.12, y - ph * k);
          g.lineTo(x - size * 0.42 * (1 - k - 0.25), y - ph * (k + 0.2));
        }
        g.lineTo(x, y - ph);
        g.lineTo(x + size * 0.5, y);
      } else {
        g.lineTo(x - size * 0.5, y);
        g.arc(x, y, size * range(0.5, 0.75), Math.PI, 0);
      }
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
  }

  // A conifer standing on y = base: tiers of drooping boughs, narrowing to the tip
  function pine(g, x, base, height, width, color) {
    g.fillStyle = color;
    g.fillRect(x - width * 0.04, base - height * 0.2, width * 0.08, height * 0.2);
    const tiers = 7;
    for (let i = 0; i < tiers; i++) {
      const k = i / tiers;
      const y = base - height * (0.12 + k * 0.82);
      const half = (width / 2) * (1 - k) * range(0.85, 1.1);
      g.beginPath();
      g.moveTo(x, y - height * 0.16);
      g.quadraticCurveTo(x - half * 0.4, y - height * 0.04, x - half, y + height * 0.03);
      g.lineTo(x + half, y + height * 0.03);
      g.quadraticCurveTo(x + half * 0.4, y - height * 0.04, x, y - height * 0.16);
      g.fill();
    }
  }

  // Paper rising as Ironhill's ink-blot mist: blobs, blurred then thresholded so their edges are
  // crisp and they merge into each other, above a solid edge `edge` px down, solid for `tail` below
  function mist(w, edge, tail, density = 1) {
    const h = edge + tail;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    g.filter = 'blur(12px)';
    g.fillStyle = '#000';
    g.fillRect(-40, edge, w + 80, h);
    const n = Math.round((w / 26) * density);
    for (let i = 0; i < n; i++) {
      const k = Math.pow(rnd(), 1.6);
      g.beginPath();
      g.arc(rnd() * w, edge - k * edge * 0.85, range(10, 48) * (1 - k * 0.6), 0, Math.PI * 2);
      g.fill();
    }
    g.filter = 'none';
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      d[i] = 244; d[i + 1] = 237; d[i + 2] = 221;
      d[i + 3] = Math.max(0, Math.min(255, (a - 110) * 6));
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  // Paper rising as a fog bank: a long soft fade, with billows along it
  function fog(w, edge, tail) {
    const h = edge + tail;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, edge - 260, 0, edge);
    grad.addColorStop(0, 'rgba(244, 237, 221, 0)');
    grad.addColorStop(0.7, 'rgba(244, 237, 221, 0.75)');
    grad.addColorStop(1, PAPER);
    g.fillStyle = grad;
    g.fillRect(0, edge - 260, w, 260);
    g.fillStyle = PAPER;
    g.fillRect(0, edge, w, tail);
    for (let x = -100; x < w + 100; x += range(90, 180)) {
      const r = range(90, 200);
      const y = edge - range(20, 120);
      const b = g.createRadialGradient(x, y, 0, x, y, r);
      b.addColorStop(0, 'rgba(244, 237, 221, 0.85)');
      b.addColorStop(1, 'rgba(244, 237, 221, 0)');
      g.fillStyle = b;
      g.save();
      g.translate(x, y);
      g.scale(1.8, 0.7);
      g.translate(-x, -y);
      g.fillRect(x - r, y - r, r * 2, r * 2);
      g.restore();
    }
    return cv;
  }

  // The next section's top as a torn page, with sprigs tucked in under its edge
  function tornPage(g, w, h, edge) {
    for (let x = -40; x < w + 40; x += range(70, 140)) {
      sprig(g, x, edge + 30, -Math.PI / 2 + range(-0.7, 0.7), range(70, 150), {
        leaf: 22, wide: 0.36, fills: [...TONES.mid, ...TONES.sage], stem: '#3c4f30', stemW: 1.4, pull: 0.04, toward: -Math.PI / 2,
      });
    }
    g.save();
    g.shadowColor = 'rgba(0, 0, 0, 0.5)';
    g.shadowBlur = 34;
    g.shadowOffsetY = -8;
    g.fillStyle = PAPER;
    g.beginPath();
    g.moveTo(-10, h);
    const ys = [];
    for (let x = -10; x <= w + 10; x += 4) {
      const y = edge + Math.sin(x * 0.006 + 1.3) * 14 + Math.sin(x * 0.021) * 5 + (rnd() - 0.5) * 4;
      ys.push([x, y]);
      g.lineTo(x, y);
    }
    g.lineTo(w + 10, h);
    g.closePath();
    g.fill();
    g.restore();
    // The deckle: a fibrous lighter rim
    g.strokeStyle = 'rgba(255, 252, 242, 0.9)';
    g.lineWidth = 1.5;
    g.beginPath();
    ys.forEach(([x, y], i) => (i ? g.lineTo(x, y + 1) : g.moveTo(x, y + 1)));
    g.stroke();
  }

  // ---- The variants ---------------------------------------------------------------------------
  // Each returns its layers: { in: 'hero' | 'next', draw(g, w, h), speed (1: with the page, more:
  // faster, so nearer), h (height; next layers reach up into the hero by REACH), z, part (−1 / 1:
  // slides that way as you scroll) }, or the paper rising into the hero: { in: 'next', rise(w, tail)
  // giving a canvas whose solid paper starts REACH down }. That starts a little below the hero
  // (DROP, over a strip of the hero's forest), so the first screen is all forest, and rises faster
  // than the page as you scroll
  const VARIANTS = {
    canopy(W, H) {
      const near = { leaf: 30, wide: 0.4, fills: TONES.near, stem: '#0e150a', stemW: 2, pull: 0.03, rib: 'rgba(169, 186, 134, 0.1)' };
      return [
        { in: 'hero', speed: 0.55, draw(g, w, h) {
          trunks(g, w, h, 14, '#26311e');
          cluster(g, w * 0.12, -20, 240, { leaf: 20, wide: 0.4, fills: TONES.far, stem: '#26311e', stemW: 1.2 }, { from: Math.PI / 2, spread: 2.4 });
          cluster(g, w * 0.7, -30, 260, { leaf: 20, wide: 0.4, fills: TONES.far, stem: '#26311e', stemW: 1.2 }, { from: Math.PI / 2, spread: 2.6 });
          haze(g, w, h, 0.35, 0.1);
        } },
        { in: 'hero', speed: 0.8, draw(g, w, h) {
          const o = { leaf: 24, wide: 0.4, fills: TONES.mid, stem: '#2b3922', stemW: 1.5, pull: 0.02 };
          cluster(g, -20, h * 0.5, h * 0.42, o, { from: 0, spread: 2.6 });
          cluster(g, w + 20, h * 0.42, h * 0.4, o, { from: Math.PI, spread: 2.6 });
          cluster(g, w * 0.55, h + 30, h * 0.3, o, { from: -Math.PI / 2, spread: 2.2 });
        } },
        { in: 'hero', speed: 1.25, draw(g, w, h) {
          cluster(g, -40, h + 20, h * 0.55, near, { from: -Math.PI / 4, spread: 1.9 });
          cluster(g, w + 40, h + 40, h * 0.5, near, { from: -Math.PI * 0.75, spread: 1.9 });
          for (let i = 0; i < 4; i++) sprig(g, w + 10, range(-20, 60), Math.PI * range(0.65, 0.85), h * range(0.35, 0.55), { ...near, toward: Math.PI / 2, pull: 0.05 });
        } },
        { in: 'next', rise: (w, tail) => mist(w, REACH, tail) },
        { in: 'next', speed: 1.15, z: 1, h: REACH + 170, draw(g, w, h) {
          // The canopy's edge, hanging down over the paper
          for (let x = -60; x < w + 60; x += range(90, 200)) {
            if (x > w * 0.3 && x < w * 0.62 && rnd() < 0.7) continue;
            cluster(g, x, REACH * 0.45, range(110, 190), { ...near, toward: Math.PI / 2, pull: 0.06 }, { from: Math.PI / 2, spread: 2.4, count: 9 });
          }
        } },
      ];
    },

    sprigs(W, H) {
      const hang = (g, w, n, len, o, sides) => {
        for (let i = 0; i < n; i++) {
          const x = sides ? (rnd() < 0.5 ? range(-0.02, 0.22) : range(0.78, 1.02)) * w : range(0, 1) * w;
          sprig(g, x, -10, Math.PI / 2 + range(-0.5, 0.5), len * range(0.5, 1), { ...o, toward: Math.PI / 2, pull: 0.08 });
        }
      };
      return [
        { in: 'hero', speed: 0.6, draw(g, w, h) {
          hang(g, w, 26, h * 0.32, { leaf: 15, wide: 0.38, fills: TONES.far, stem: '#2a3622', stemW: 1 });
          haze(g, w, h, 0.5, 0.07);
        } },
        { in: 'hero', speed: 0.85, draw(g, w, h) {
          hang(g, w, 16, h * 0.5, { leaf: 21, wide: 0.38, fills: [...TONES.mid, TONES.sage[0]], stem: '#33452a', stemW: 1.4 }, true);
        } },
        { in: 'hero', speed: 1.35, draw(g, w, h) {
          hang(g, w, 7, h * 0.75, { leaf: 32, wide: 0.4, fills: TONES.near, stem: '#0e150a', stemW: 2.2, rib: 'rgba(169, 186, 134, 0.12)' }, true);
        } },
        { in: 'next', rise: (w, tail) => fog(w, REACH, tail) },
      ];
    },

    fieldguide(W, H) {
      const lineSprig = (g, x, y, a, len, alpha, size) => sprig(g, x, y, a, len, {
        leaf: size, wide: 0.34, line: `rgba(169, 186, 134, ${alpha})`, lineW: 1, stem: `rgba(169, 186, 134, ${alpha})`, stemW: 1, pull: 0.03, toward: a - 0.4, branch: 0.3,
      });
      return [
        { in: 'hero', speed: 0.6, draw(g, w, h) {
          for (let i = 0; i < 9; i++) lineSprig(g, range(0, 1) * w, h * range(0.6, 1.05), -Math.PI / 2 + range(-0.6, 0.6), h * range(0.2, 0.35), 0.16, 16);
        } },
        { in: 'hero', speed: 0.9, draw(g, w, h) {
          lineSprig(g, w * 0.03, h * 1.02, -Math.PI * 0.42, h * 0.75, 0.42, 30);
          lineSprig(g, w * 0.97, h * 0.98, -Math.PI * 0.6, h * 0.6, 0.42, 28);
        } },
        { in: 'next', speed: 1.45, h: REACH + 220, draw(g, w, h) { tornPage(g, w, h, REACH * 0.62); } },
      ];
    },

    clearing(W, H) {
      const near = { leaf: 30, wide: 0.4, fills: TONES.near, stem: '#0e150a', stemW: 2, pull: 0.02, rib: 'rgba(169, 186, 134, 0.1)' };
      const side = (g, w, h, dir) => {
        const x0 = dir < 0 ? -30 : w + 30;
        const out = dir < 0 ? 0 : Math.PI;
        cluster(g, x0, h * 0.2, h * 0.4, near, { from: out, spread: 2.2 });
        cluster(g, x0, h * 0.62, h * 0.55, near, { from: out, spread: 2 });
        cluster(g, x0 - dir * w * 0.06, h + 30, h * 0.6, near, { from: out - dir * 0.5, spread: 1.8 });
      };
      return [
        { in: 'hero', speed: 0.55, draw(g, w, h) {
          trunks(g, w, h, 10, '#27331f');
          haze(g, w, h, 0.25, 0.12);
        } },
        { in: 'hero', speed: 0.85, draw(g, w, h) {
          const o = { leaf: 22, wide: 0.4, fills: TONES.mid, stem: '#2b3922', stemW: 1.4 };
          cluster(g, w * 0.08, h * 0.45, h * 0.32, o);
          cluster(g, w * 0.92, h * 0.5, h * 0.32, o);
        } },
        { in: 'hero', speed: 1.1, part: -1, draw(g, w, h) { side(g, w, h, -1); } },
        { in: 'hero', speed: 1.1, part: 1, draw(g, w, h) { side(g, w, h, 1); } },
        { in: 'next', rise: (w, tail) => mist(w, REACH, tail, 1.2) },
      ];
    },

    edges(W, H) {
      // Sized to the width, so it keeps to the outer quarter or so and the lit middle stays clear
      const k = Math.min(Math.max(W / 1440, 0.5), 1.25);
      const base = Math.min(H, W * (W < 700 ? 0.3 : 0.24));
      // Dark, so it reads as the shadow at the edges: the far layer a shade off the ground, the near
      // one nearly black, with a faint sage rib
      const near = { leaf: 30 * k, wide: 0.4, fills: TONES.near, stem: '#0b1108', stemW: 2 * k, pull: 0.02, rib: 'rgba(169, 186, 134, 0.12)' };
      const back = { leaf: 24 * k, wide: 0.4, fills: ['#1c2615', '#202b18', '#18210f', '#243020'], stem: '#1a2313', stemW: 1.5 * k, pull: 0.02 };
      // One side's foliage: a corner mass at the top, a smaller one halfway down, and the largest in
      // the bottom corner, all fanning in from beyond the edge
      // Kept to the first screen, so a longer hero (hero-burn.js) doesn't cut the bottom mass off
      // at its own bottom edge
      const side = (g, w, h, dir, o, size) => {
        const hs = Math.min(h, window.innerHeight);
        const x0 = dir < 0 ? -30 : w + 30;
        const ang = (a) => (dir < 0 ? a : Math.PI - a);
        cluster(g, x0, hs * 0.04, base * 0.55 * size, o, { from: ang(0.65), spread: 1.7 });
        cluster(g, x0, hs * 0.5, base * 0.42 * size, o, { from: ang(0), spread: 1.5 });
        cluster(g, x0, hs + 20, base * 0.72 * size, o, { from: ang(-0.75), spread: 1.7 });
      };
      return [
        { in: 'hero', speed: 1, part: -1, by: 0.16, draw(g, w, h) { side(g, w, h, -1, back, 1.2); } },
        { in: 'hero', speed: 1, part: 1, by: 0.16, draw(g, w, h) { side(g, w, h, 1, back, 1.2); } },
        { in: 'hero', speed: 1, part: -1, by: 0.34, draw(g, w, h) { side(g, w, h, -1, near, 0.95); } },
        { in: 'hero', speed: 1, part: 1, by: 0.34, draw(g, w, h) { side(g, w, h, 1, near, 0.95); } },
      ];
    },

    treeline(W, H) {
      const s = W / 1440;
      return [
        { in: 'hero', speed: 0.45, draw(g, w, h) {
          ridge(g, w, h, h * 0.56, 30 * s, 70 * s, '#34412c', 0.25);
          haze(g, w, h, 0.55, 0.1);
        } },
        { in: 'hero', speed: 0.65, draw(g, w, h) {
          ridge(g, w, h, h * 0.68, 34 * s, 90 * s, '#27331f', 0.35);
          haze(g, w, h, 0.7, 0.07);
        } },
        { in: 'hero', speed: 0.9, draw(g, w, h) {
          ridge(g, w, h, h * 0.8, 30 * s, 120 * s, '#131b0e', 0.45);
        } },
        { in: 'next', rise: (w, tail) => mist(w, REACH, tail, 1.3) },
        { in: 'next', speed: 1.2, z: 1, h: REACH + 120, draw(g, w, h) {
          // A few near pines at the edges, standing in the mist
          [[0.03, 1], [0.1, 0.72], [0.89, 0.8], [0.97, 1.05]].forEach(([k, t]) => pine(g, w * k, h, h * 0.95 * t, 150 * s * t, '#0f160b'));
        } },
      ];
    },
  };

  // ---- Layers and scrolling -------------------------------------------------------------------
  const backBox = document.createElement('div');
  backBox.className = 'hd-back';
  backBox.setAttribute('aria-hidden', 'true');
  const frontBox = document.createElement('div');
  frontBox.className = 'hd-front';
  frontBox.setAttribute('aria-hidden', 'true');
  frontBox.style.height = `${REACH + DROP + 300}px`;
  frontBox.style.top = `${-REACH}px`;
  hero.prepend(backBox);

  let layers = [];
  let built = '';

  function build() {
    const W = hero.clientWidth;
    const H = hero.offsetHeight;
    if (!W || (`${W}x${H}` === built && layers.length)) return;
    built = `${W}x${H}`;
    seed = [...variant].reduce((a, c) => a + c.charCodeAt(0) * 131, 7);
    backBox.textContent = '';
    frontBox.textContent = '';
    // The hero's forest, carried on under the rising paper until it has risen
    const ground = document.createElement('div');
    ground.className = 'hd-ground';
    Object.assign(ground.style, { top: `${REACH}px`, height: `${DROP + 40}px`, background: getComputedStyle(hero).backgroundColor });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    layers = VARIANTS[variant](W, H).map((spec) => {
      const h = spec.in === 'hero' ? H : spec.h || REACH + 200;
      let cv;
      if (spec.rise) {
        if (!ground.isConnected) frontBox.append(ground);
        cv = spec.rise(W, RISE_MAX + 340);
        cv.style.top = `${DROP}px`;
      } else {
        cv = document.createElement('canvas');
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(h * dpr);
        const g = cv.getContext('2d');
        g.scale(dpr, dpr);
        g.lineCap = 'round';
        spec.draw(g, W, h);
      }
      cv.className = 'hd-layer';
      cv.style.width = `${W}px`;
      cv.style.height = `${spec.rise ? cv.height : h}px`;
      if (spec.z) cv.style.zIndex = spec.z;
      (spec.in === 'hero' ? backBox : frontBox).append(cv);
      return spec.rise
        ? { el: cv, speed: RISE_SPEED, max: RISE_MAX, part: 0, H, W }
        : { el: cv, speed: spec.speed, part: spec.part || 0, by: spec.by || 0.32, H, W };
    });
    // Only the variants that reach into the next section need a place there
    if (frontBox.childElementCount && !frontBox.isConnected) next.prepend(frontBox);
    move();
  }

  // The parting layers start out beyond the edges and grow in once the hero is showing (enter: 0 → 1)
  let enter = 0;
  function grow() {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min((now - t0) / 1600, 1);
      enter = 1 - Math.pow(1 - k, 3);
      move();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  if (reduced) enter = 1;
  else if (root.classList.contains('has-intro')) document.addEventListener('tinker:intro-done', grow, { once: true });
  else grow();

  function move() {
    const y = Math.min(window.scrollY || 0, (layers[0] ? layers[0].H : 900) * 1.4);
    layers.forEach((l) => {
      // Parted by the scroll, or not yet grown in
      const p = Math.max(Math.min(y / (l.H * 0.8), 1), 1 - enter);
      const dx = l.part ? l.part * p * l.W * l.by : 0;
      const sc = l.part ? 1 + p * 0.12 : 1;
      const dy = l.max ? Math.max((1 - l.speed) * y, -l.max) : (1 - l.speed) * y;
      l.el.style.transform = `translate3d(${dx}px, ${dy}px, 0)${sc !== 1 ? ` scale(${sc})` : ''}`;
      if (l.part) l.el.style.transformOrigin = l.part < 0 ? '0 100%' : '100% 100%';
    });
  }

  let ticking = false;
  if (!reduced) {
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; move(); });
    }, { passive: true });
  }
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  const start = () => build();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  start();
})();
