// Hero burn (trial): as the hero scrolls up, the paper of the next section eats into it from the
// bottom, along a ragged edge mirrored about the middle (a Rorschach blot), leaving islands and holes
// ahead of it, after Ironhill (ironhill.au). The hero runs 40% of a screen longer to give it room.
// Picked by html[data-hero-burn] (head.njk: the page's heroBurn, or ?burn=<name>), one of:
//   inkblot  Ironhill's: blotchy mirrored islands with a faint misty rim; the edge foliage
//            (hero-depth.js) stays over the paper as the forest behind it goes (the paper is cut
//            away wherever it is, so it can stay behind the hero's copy)
//   singed   burning paper with no fire: one ragged edge, the paper beside it toasted brown, a
//            thin char line along it
//   arch     a hole burning open from the bottom middle, widening into a frayed arch
// The noise is made once (at half the screen's resolution, again on resize); each scroll only
// thresholds it against where the edge has got to and paints the result onto one canvas.
(() => {
  const root = document.documentElement;
  const variant = root.dataset.heroBurn;
  const hero = document.getElementById('hero');
  if (!variant || !hero) return;

  const PAPER = [244, 237, 221];
  const V = {
    //        noise: grid px per cell, octaves, falloff; amp: how ragged; band: edge depth (screens)
    inkblot: { scale: 46, oct: 5, fall: 0.55, amp: 0.95, band: 0.34, rim: { color: [207, 208, 192], alpha: 0.32, width: 0.22 }, spareFoliage: true },
    singed: { scale: 110, oct: 4, fall: 0.5, amp: 0.45, band: 0.26, char: { color: [28, 22, 12], alpha: 0.75, width: 0.07 }, toast: { color: [168, 140, 92], alpha: 0.6, width: 0.4 } },
    arch: { scale: 18, oct: 4, fall: 0.62, amp: 0.55, band: 0.2, arch: true, rim: { color: [244, 237, 221], alpha: 0.35, width: 0.12 } },
  }[variant];
  if (!V) return;

  // Value noise, seeded and smooth, summed over octaves
  const SEED = 7;
  const hash = (i, j) => {
    let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(SEED, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const vnoise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  const canvas = document.createElement('canvas');
  canvas.className = 'hb-mask';
  canvas.setAttribute('aria-hidden', 'true');
  hero.append(canvas);
  const ctx = canvas.getContext('2d');

  let gw = 0, gh = 0, field = null, img = null, px = null, key = '', last = null;

  function build() {
    const W = hero.clientWidth, H = hero.offsetHeight;
    if (!W || `${W}x${H}` === key) return;
    key = `${W}x${H}`;
    gw = Math.ceil(W / 2);
    gh = Math.ceil(H / 2);
    canvas.width = gw;
    canvas.height = gh;
    field = new Float32Array(gw * gh);
    let lo = Infinity, hi = -Infinity;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        // Mirrored about the middle
        const mx = Math.abs(x + 0.5 - gw / 2) / V.scale;
        const my = y / V.scale;
        let n = 0, a = 1, f = 1, sum = 0;
        for (let o = 0; o < V.oct; o++) {
          n += a * vnoise(mx * f + o * 17.3, my * f + o * 9.1);
          sum += a;
          a *= V.fall;
          f *= 2;
        }
        n /= sum;
        field[y * gw + x] = n;
        if (n < lo) lo = n;
        if (n > hi) hi = n;
      }
    }
    // Spread to −1…1
    for (let i = 0; i < field.length; i++) field[i] = ((field[i] - lo) / (hi - lo)) * 2 - 1;
    img = ctx.createImageData(gw, gh);
    px = new Uint32Array(img.data.buffer);
    last = null;
    paint();
  }

  const rgba = (c, a) => ((Math.round(a * 255) << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  const SOLID = rgba(PAPER, 1);
  const mix = (a, b, k) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));

  // How far the edge has got: 0 before it starts (the hero's bottom still a third of a screen
  // below the fold), then rising 1.6 times as fast as the page, so it has taken the hero about as
  // the next section's heading comes up
  function travel() {
    const vh = window.innerHeight;
    const r = hero.getBoundingClientRect();
    return { vh, r, t: Math.max(0, vh - r.bottom + vh * 0.3) * 1.6 };
  }

  // Where everything below is paper, on screen (scripts.njk turns the header to paper by it)
  window.SageHeroPaperTop = () => {
    const { vh, r, t } = travel();
    const B = V.band * vh;
    if (V.arch) {
      // The arch has taken a full line across where its frayed edge, at its worst, clears the
      // corners (its width is squeezed by 0.62)
      const reach = t - 0.4 * B - V.amp * B;
      const half = (r.width / 2) * 0.62;
      if (reach <= half) return r.bottom;
      return r.bottom + 0.4 * B - Math.sqrt(reach * reach - half * half);
    }
    return r.bottom + B * 0.4 - t + B * (V.amp + 0.1);
  };

  function paint() {
    if (!field) return;
    const { vh, t } = travel();
    const T = Math.round(t);
    if (T === last) return;
    last = T;
    const B = (V.band * vh) / 2; // in grid px
    const e = 1.2 / B; // about a pixel, for a smooth edge
    const yEdge = gh + B * 0.4 - t / 2;

    if (t <= 0) { ctx.clearRect(0, 0, gw, gh); canvas.style.visibility = 'hidden'; return; }
    canvas.style.visibility = '';

    const rimW = V.rim ? V.rim.width : 0;
    const charW = V.char ? V.char.width : 0;
    const toastW = V.toast ? V.toast.width : 0;
    const reachIn = V.amp + Math.max(rimW, charW) + e;
    const reachOut = V.amp + toastW + e;
    const ox = gw / 2, oy = gh + B * 0.4, R = t / 2 - B * 0.4;

    for (let y = 0; y < gh; y++) {
      const row = y * gw;
      let base = 0;
      if (!V.arch) {
        base = (y - yEdge) / B;
        // Whole rows that are all forest or all paper
        if (base < -reachIn - 0.05) { px.fill(0, row, row + gw); continue; }
        if (base > reachOut + 0.05) { px.fill(SOLID, row, row + gw); continue; }
      }
      for (let x = 0; x < gw; x++) {
        let f;
        if (V.arch) {
          const d = Math.hypot((x - ox) * 0.62, y - oy);
          f = (R - d) / B + field[row + x] * V.amp;
        } else {
          f = base + field[row + x] * V.amp;
        }
        let c = 0;
        if (f > e) {
          // Paper, toasted near the edge
          if (V.toast && f < toastW) {
            const k = 1 - f / toastW;
            c = rgba(mix(PAPER, V.toast.color, V.toast.alpha * k * k), 1);
          } else c = SOLID;
        } else if (f > -e) {
          const a = (f + e) / (2 * e);
          c = rgba(V.toast ? mix(PAPER, V.toast.color, V.toast.alpha) : PAPER, a);
        } else if (V.char && f > -charW) {
          c = rgba(V.char.color, V.char.alpha * (1 + f / charW));
        } else if (V.rim && f > -rimW) {
          c = rgba(V.rim.color, V.rim.alpha * (1 + f / rimW));
        }
        px[row + x] = c;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (V.spareFoliage) spare();
  }

  // Cut the foliage's shapes out of the paper, where each of its layers is right now
  function spare() {
    const h = hero.getBoundingClientRect();
    ctx.globalCompositeOperation = 'destination-out';
    hero.querySelectorAll('.hd-back .hd-layer').forEach((layer) => {
      const r = layer.getBoundingClientRect();
      ctx.drawImage(layer, (r.left - h.left) / 2, (r.top - h.top) / 2, r.width / 2, r.height / 2);
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; paint(); });
  }, { passive: true });
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 200); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  // It follows the scroll rather than playing on its own, so it runs with reduced motion too
  build();
})();
