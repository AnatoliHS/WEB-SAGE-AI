// Sage leaves, drawn once at high resolution for the intro's field (intros/fields/leaves.js) and the
// hero's drifting leaves (hero-ambient.js) to stamp. Each is a real sage leaf's shape: a long oval,
// broadest a little below the middle, with a soft point and a finely crenate (wavy) edge, curved a
// little along its midrib. On top: grey-green, shaded across as if curled, the veins sunk into a
// pebbly, quilted surface; underneath: paler and silvery, the veins raised. Far leaves can take a
// softened copy (depth of field).
//
//   const leaves = SageLeaf.make(6);   // [{ top, under, soft }], each canvas LW × LH, pointing +x
//   SageLeaf.make(6, SageLeaf.tones()) // in the theme's tones (style.css, --leaves: green | purple)
//   ctx.drawImage(leaf.top, -SageLeaf.W / 2, -SageLeaf.H / 2, SageLeaf.W, SageLeaf.H)
//   SageLeaf.W, SageLeaf.H: its size in CSS px at a scale of 1 (64 × 27)
window.SageLeaf = (() => {
  const LW = 320, LH = 136; // sprite px
  const W = 64, H = 27.2;   // drawn size at scale 1
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const range = (a, b) => a + rnd() * (b - a);

  // Leaf tones: [top, top shade, underside]
  const GREEN = [
    [[150, 166, 124], [86, 102, 68], [176, 186, 160]],   // fresh sage
    [[136, 150, 116], [76, 90, 62], [168, 178, 154]],    // grey sage
    [[164, 176, 132], [98, 112, 74], [184, 192, 166]],   // pale young leaf
    [[118, 134, 96], [64, 78, 50], [156, 168, 140]],     // deep
    [[176, 164, 104], [116, 100, 56], [192, 182, 144]],  // drying, gold
  ];
  const rgb = (c, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  function shape() {
    const len = LW - 34, x0 = 22;
    const wide = LH * range(0.3, 0.36);
    const bend = range(-6, 6);
    const asym = range(0.88, 1.06);
    const wav = range(0.018, 0.03), wf = range(46, 62), wp = rnd() * 6;
    // The midrib's y and the half-width at s (0 base … 1 tip)
    const mid = (s) => LH / 2 + bend * Math.sin(Math.PI * s);
    const half = (s) => {
      const body = Math.pow(Math.sin(Math.PI * Math.pow(s, 0.82)), 0.85);
      // Rounded at the base, drawn to a soft point at the tip
      return wide * body * (1 + wav * Math.sin(s * wf + wp)) * (s > 0.97 ? (1 - s) / 0.03 : 1);
    };
    const X = (s) => x0 + s * len;
    return { len, x0, wide, mid, half, X, asym };
  }

  function outline(g, sh) {
    const N = 90;
    g.beginPath();
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      g.lineTo(sh.X(s), sh.mid(s) - sh.half(s));
    }
    for (let i = N; i >= 0; i--) {
      const s = i / N;
      g.lineTo(sh.X(s), sh.mid(s) + sh.half(s) * sh.asym);
    }
    g.closePath();
  }

  // The veins: the midrib, and side veins leaving it, curving forward and joining near the edge
  function veins(g, sh, side) {
    const n = 9;
    for (let k = 0; k < n; k++) {
      const s0 = 0.08 + (k / n) * 0.8;
      const s1 = Math.min(s0 + range(0.14, 0.2), 0.98);
      const x0 = sh.X(s0), y0 = sh.mid(s0);
      const reach = sh.half(s1) * 0.86 * (side > 0 ? sh.asym : 1);
      const x1 = sh.X(s1), y1 = sh.mid(s1) + side * reach;
      g.moveTo(x0, y0);
      g.quadraticCurveTo(x0 + (x1 - x0) * 0.25, y0 + side * reach * 0.8, x1, y1);
    }
  }

  function draw(sh, tone, under) {
    const c = document.createElement('canvas');
    c.width = LW;
    c.height = LH;
    const g = c.getContext('2d');
    g.lineCap = 'round';

    // Stalk
    g.strokeStyle = rgb(under ? tone[2] : tone[1], 0.9);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(2, sh.mid(0) + 3);
    g.quadraticCurveTo(12, sh.mid(0) + 1, sh.x0 + 6, sh.mid(0.02));
    g.stroke();

    g.save();
    outline(g, sh);
    g.clip();

    // Base colour, shaded across the leaf as if curled down at its edges
    const top = under ? tone[2] : tone[0];
    const shade = under ? tone[0] : tone[1];
    const across = g.createLinearGradient(0, LH / 2 - sh.wide, 0, LH / 2 + sh.wide);
    across.addColorStop(0, rgb(shade));
    across.addColorStop(0.32, rgb(top));
    across.addColorStop(0.55, rgb(top.map((v) => Math.min(255, v + 10))));
    across.addColorStop(1, rgb(shade));
    g.fillStyle = across;
    g.fillRect(0, 0, LW, LH);
    // Lighter towards the base, as the light falls along it
    const along = g.createLinearGradient(sh.x0, 0, sh.x0 + sh.len, 0);
    along.addColorStop(0, 'rgba(255, 252, 230, 0.12)');
    along.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    g.fillStyle = along;
    g.fillRect(0, 0, LW, LH);

    // The pebbly, quilted surface: small bumps, lit from the top left
    if (!under) {
      for (let i = 0; i < 700; i++) {
        const s = rnd();
        const x = sh.X(s), y = sh.mid(s) + (rnd() * 2 - 1) * sh.half(s);
        const r = range(1.5, 3.6);
        g.fillStyle = 'rgba(255, 255, 240, 0.07)';
        g.beginPath();
        g.arc(x - 0.7, y - 0.7, r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(20, 30, 10, 0.08)';
        g.beginPath();
        g.arc(x + 0.9, y + 0.9, r * 0.8, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      // Underneath: a fine silvery fuzz
      for (let i = 0; i < 900; i++) {
        const s = rnd();
        g.fillStyle = 'rgba(255, 255, 250, 0.05)';
        g.fillRect(sh.X(s), sh.mid(s) + (rnd() * 2 - 1) * sh.half(s), 1.2, 1.2);
      }
    }

    // Veins: sunk on top (a dark groove with a lit edge), raised underneath (lighter)
    const vein = (color, width, dy) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      g.save();
      g.translate(0, dy);
      veins(g, sh, -1);
      veins(g, sh, 1);
      g.restore();
      g.stroke();
      g.beginPath();
      for (let i = 0; i <= 40; i++) {
        const s = i / 40 * 0.97;
        g.lineTo(sh.X(s), sh.mid(s) + dy);
      }
      g.lineWidth = width * 1.8;
      g.stroke();
    };
    if (under) {
      vein('rgba(255, 255, 245, 0.3)', 1.4, 0);
    } else {
      vein('rgba(255, 255, 235, 0.16)', 1.6, 0.9);
      vein('rgba(30, 40, 18, 0.38)', 1.3, 0);
    }

    // A soft sheen along the upper half
    const sheen = g.createRadialGradient(sh.x0 + sh.len * 0.38, LH / 2 - sh.wide * 0.4, 0, sh.x0 + sh.len * 0.38, LH / 2 - sh.wide * 0.4, sh.len * 0.5);
    sheen.addColorStop(0, `rgba(255, 255, 240, ${under ? 0.14 : 0.1})`);
    sheen.addColorStop(1, 'rgba(255, 255, 240, 0)');
    g.fillStyle = sheen;
    g.fillRect(0, 0, LW, LH);
    g.restore();

    // The fine hairs catching the light along the edge
    g.strokeStyle = `rgba(235, 240, 220, ${under ? 0.5 : 0.28})`;
    g.lineWidth = 1.2;
    outline(g, sh);
    g.stroke();
    return c;
  }

  function soften(src) {
    const c = document.createElement('canvas');
    c.width = LW;
    c.height = LH;
    const g = c.getContext('2d');
    g.filter = 'blur(4px)';
    g.drawImage(src, 0, 0);
    return c;
  }

  const cache = {};
  // Purple: the original Sage purples, #302aff (blue-violet) and #971aff (violet), and the shades
  // between, each with its darker curl and a paler underside
  const PURPLE = [
    [[151, 26, 255], [78, 10, 140], [200, 156, 255]],    // #971aff
    [[48, 42, 255], [22, 18, 140], [156, 152, 255]],     // #302aff
    [[100, 34, 255], [50, 14, 140], [178, 154, 255]],    // between the two
    [[124, 30, 220], [62, 10, 118], [186, 150, 240]],    // deeper violet
    [[168, 96, 255], [96, 44, 160], [212, 184, 255]],    // pale, young
  ];
  const SETS = { green: GREEN, purple: PURPLE };

  // Which tones the theme asks for (style.css, --leaves on the root)
  const tones = () => getComputedStyle(document.documentElement).getPropertyValue('--leaves').trim() || 'green';

  function make(n = 6, set = 'green') {
    const key = `${set}:${n}`;
    if (cache[key]) return cache[key];
    const TONES = SETS[set] || GREEN;
    seed = 3;
    cache[key] = Array.from({ length: n }, (_, i) => {
      const sh = shape();
      const tone = TONES[i % TONES.length];
      const top = draw(sh, tone, false);
      return { top, under: draw(sh, tone, true), soft: soften(top) };
    });
    return cache[key];
  }

  return { make, tones, W, H };
})();
