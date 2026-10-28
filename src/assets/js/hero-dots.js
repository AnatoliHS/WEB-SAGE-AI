// The dot-matrix hero (component/hero.njk) and its brand in the navbar. SAGE.IS is drawn as a field
// of dots: the word is drawn four times finer than the grid, and each cell's share of ink sets its
// dot, small and light grey outside, larger and in the two purples inside.
//
// It builds in: the grey points fade in from the left, then each dot of the word switches on in
// its turn, springing to its full size with a brief flash of light. When scrolling starts (the
// header docks, scripts.njk) the hero's word plays that backwards, switching off, and the brand
// builds in the same way in the navbar, sampled from the docked wordmark's own letters (big SAGE,
// small .IS); its phrase comes in once it has. Back at the top the two swap again.
(() => {
  const field = document.querySelector('[data-hero-dots]');
  if (!field) return;
  const root = document.documentElement;
  const brand = document.getElementById('dynamic-brand');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The night ground's colours: the purples lifted a little so they read on it
  const FROM = [100, 92, 255], TO = [180, 98, 255], GREY = [241, 238, 250], LIGHT = [205, 192, 255];
  const WORD = 'SAGE.IS', OUT = 0.17, FLASH = 0.55;
  // The build's timings (ms): the grey points fading in, the word spreading over, each dot's pop
  const FIELD = 700, SPAN = 1300, DOT = 520;
  const TOTAL = FIELD * 0.5 + SPAN + DOT + 60;
  // How long each mark takes to build in, and to switch off
  const IN = { hero: TOTAL, nav: 1500 }, OFF = 1100;

  // A steady random per dot, so the build scatters the same way every time
  const rand = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const outBack = (x) => 1 + 2.9 * Math.pow(x - 1, 3) + 1.9 * Math.pow(x - 1, 2);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));

  const hero = { name: 'hero', canvas: field.querySelector('canvas'), field: true, p: 0 };
  const nav = { name: 'nav', canvas: document.createElement('canvas'), field: false, p: 0 };
  nav.canvas.className = 'nav-dots';
  nav.canvas.setAttribute('aria-hidden', 'true');
  document.body.append(nav.canvas);

  // Samples what draw(ctx) writes, in the canvas's own px on a W × H box, onto a grid of dots
  // `pitch` apart, and sizes the canvas for it. Without a field, only the word's dots are kept
  function sample(mark, W, H, pitch, draw) {
    const cols = Math.floor(W / pitch), rows = Math.floor(H / pitch), k = 4;
    const ox = (W - cols * pitch) / 2, oy = (H - rows * pitch) / 2;
    const mask = document.createElement('canvas');
    mask.width = cols * k; mask.height = rows * k;
    const mc = mask.getContext('2d');
    mc.setTransform(k / pitch, 0, 0, k / pitch, -ox * k / pitch, -oy * k / pitch);
    draw(mc);
    const ink = mc.getImageData(0, 0, mask.width, mask.height).data;
    const dots = [];
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        let cov = 0;
        for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) cov += ink[((r * k + y) * mask.width + col * k + x) * 4 + 3];
        cov /= k * k * 255;
        if (!mark.field && cov <= 0.02) continue;
        // Soft edges: the field thins out towards its sides, top and bottom
        const edge = Math.min(1, Math.min(col, cols - 1 - col) / 7) * Math.min(1, Math.min(r, rows - 1 - r) / 3);
        const f = col / (cols - 1);
        dots.push({
          x: ox + (col + 0.5) * pitch, y: oy + (r + 0.5) * pitch, cov,
          tint: FROM.map((v, i) => v + (TO[i] - v) * f),
          // In the navbar's small mark most dots only partly cover a letter: they're kept brighter
          a: cov > 0.02 ? (mark.field ? 0.35 + 0.65 * cov : 0.65 + 0.35 * cov) : OUT * edge,
          // When it switches on: mostly left to right, a little scattered
          delay: 0.6 * f + 0.1 * r / rows + 0.3 * rand(col, r),
        });
      }
    }
    const dpr = Math.min(devicePixelRatio || 1, 2);
    mark.canvas.width = Math.round(W * dpr); mark.canvas.height = Math.round(H * dpr);
    mark.canvas.style.height = `${H}px`;
    Object.assign(mark, { ctx: mark.canvas.getContext('2d'), dpr, W, H, pitch, dots });
    paint(mark);
  }

  // The hero's word: set letter by letter (each letter its own box, unkerned, at -0.012em, as the
  // wordmark is), 84% of the field's width, a few dots of field around it
  function buildHero() {
    const W = field.clientWidth;
    if (!W) return;
    const pitch = Math.max(6, W / 136);
    const m = document.createElement('canvas').getContext('2d');
    m.font = '100px Anton';
    const xs = [], ms = [];
    let pen = 0;
    for (const ch of WORD) { const mt = m.measureText(ch); xs.push(pen); ms.push(mt); pen += mt.width - 1.2; }
    const last = WORD.length - 1, inkLeft = xs[0] - ms[0].actualBoundingBoxLeft;
    const inkW = xs[last] + ms[last].actualBoundingBoxRight - inkLeft;
    const asc = Math.max(...ms.map((mt) => mt.actualBoundingBoxAscent)), desc = Math.max(...ms.map((mt) => mt.actualBoundingBoxDescent));
    const size = 100 * (Math.floor(W / pitch) * pitch * 0.84) / inkW, k = size / 100;
    const wordH = (asc + desc) * k, H = (Math.round(wordH / pitch) + 8) * pitch;
    const x0 = W / 2 - inkW * k / 2 - inkLeft * k, base = (H - wordH) / 2 + asc * k;
    sample(hero, W, H, pitch, (c) => {
      c.font = `${size}px Anton`;
      [...WORD].forEach((ch, i) => c.fillText(ch, x0 + xs[i] * k, base));
    });
    field.classList.add('is-drawn');
  }

  // The navbar's: the docked wordmark's own letters, where they sit (scripts.njk keeps the brand
  // docked over this hero, its letters unseen), about fifteen dots to SAGE's height
  function buildNav() {
    if (!brand) return;
    const b = brand.getBoundingClientRect();
    if (!b.height || !brand.offsetHeight) return;
    const scale = b.height / brand.offsetHeight, pad = 3;
    const letters = [...brand.querySelectorAll('.ltr > span')].map((el) => {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const probe = document.createElement('i');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.append(probe);
      const baseline = probe.getBoundingClientRect().top;
      probe.remove();
      return { ch: el.textContent, x: r.left + parseFloat(cs.paddingLeft) * scale - b.left + pad, y: baseline - b.top + pad, size: parseFloat(cs.fontSize) * scale };
    });
    if (!letters.length) return;
    const m = document.createElement('canvas').getContext('2d');
    m.font = `${letters[0].size}px Anton`;
    const pitch = Math.max(1.4, m.measureText('S').actualBoundingBoxAscent / 15);
    Object.assign(nav.canvas.style, { left: `${b.left - pad}px`, top: `${b.top - pad}px`, width: `${b.width + pad * 2}px` });
    sample(nav, b.width + pad * 2, b.height + pad * 2, pitch, (c) => {
      letters.forEach((l) => { c.font = `${l.size}px Anton`; c.fillText(l.ch, l.x, l.y); });
    });
  }

  // Paints every dot of a mark at its progress p (0: off, 1: built)
  function paint(mark) {
    if (!mark.ctx) return;
    const c = mark.ctx, el = mark.p * TOTAL, out = mark.pitch * 0.13;
    c.setTransform(mark.dpr, 0, 0, mark.dpr, 0, 0);
    c.clearRect(0, 0, mark.W, mark.H);
    if (mark.p <= 0) return;
    for (const d of mark.dots) {
      const inside = d.cov > 0.02;
      const base = clamp01((el - d.x / mark.W * FIELD * 0.6) / (FIELD * 0.4));
      let a = (inside ? OUT : d.a) * base, rad = out, rgb = GREY;
      if (inside) {
        const k = clamp01((el - FIELD * 0.5 - d.delay * SPAN) / DOT);
        if (k > 0) {
          const on = Math.min(1, k * 2), flash = Math.sin(Math.PI * Math.min(1, k * 1.4)) * FLASH;
          rad = out + (mark.pitch * (0.13 + (mark.field ? 0.22 : 0.3) * d.cov) - out) * outBack(k);
          rgb = d.tint.map((v, j) => Math.round(GREY[j] + (v - GREY[j]) * on + (LIGHT[j] - v) * flash));
          a += (d.a - a) * on;
        }
      }
      if (a <= 0.003) continue;
      c.fillStyle = `rgba(${rgb.join(',')},${a.toFixed(3)})`;
      c.beginPath();
      c.arc(d.x, d.y, Math.max(0, rad), 0, Math.PI * 2);
      c.fill();
    }
  }

  // The swap. Docked (scrolling has started, or the drawer is open): the hero's word switches off,
  // then the navbar's builds in; at the top, the other way round. Each waits until the other is
  // mostly gone, and turns round wherever it is if the direction changes
  let running = false, last = 0;
  function frame() {
    const now = performance.now(), dt = now - last;
    last = now;
    const docked = root.classList.contains('brand-docked');
    const leaving = docked ? hero : nav, arriving = docked ? nav : hero;
    leaving.p = still ? 0 : Math.max(0, leaving.p - dt / OFF);
    if (leaving.p <= 0.3) arriving.p = still ? 1 : Math.min(1, arriving.p + dt / IN[arriving.name]);
    paint(hero); paint(nav);
    root.classList.toggle('brand-dots-on', docked && nav.p > 0.85);
    if (leaving.p > 0 || arriving.p < 1) requestAnimationFrame(frame);
    else running = false;
  }
  function wake() {
    if (running || !hero.ctx) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  // scripts.njk docks the brand (and places it again on resize and once the fonts are in)
  document.addEventListener('sage:brand-placed', () => { buildNav(); wake(); });
  new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ['class'] });
  let timer;
  addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => { buildHero(); wake(); }, 150); });
  const start = () => { buildHero(); buildNav(); wake(); };
  if (document.fonts) document.fonts.load('100px Anton').then(start, start); else start();
})();
