// Guide (trial, concepts/guide.njk): one quiet element that leads the eye down the page, section to
// section, after Ironhill's map trail: it keeps moving with the scroll, so the page always feels
// like it goes on. Each section's label ("02 The Problem & The Solution") is a stop on its way.
// Picked by html[data-guide] (head.njk: ?guide=<name>):
//   leaftrail  a purple sage leaf drifts down the page, drawing a fine trail behind it that winds
//              through the margin and the label column; each stop's ring fills as it passes
//   leaf       the leaf alone, no trail, settling by each stop
//   thread     the hero's rule, carried on: one straight line down the left edge, a tick out to
//              each stop
//   stem       one stem grows down the left edge, putting out a pair of leaves at each stop, a bud
//              at its tip
//   midrib     the page is a leaf: a midrib runs down the left edge and at each stop a vein sweeps
//              out under the section; by the end the veins have drawn one long leaf
// It's an SVG laid on the page behind the content, so it scrolls natively; only its drawn length
// and the leaf's place follow the scroll (where the scroll is, plus a little easing).
(() => {
  const root = document.documentElement;
  const variant = root.dataset.guide;
  const hero = document.getElementById('hero');
  const main = document.getElementById('main-content');
  if (!variant || !hero || !main) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (parent) parent.append(n);
    return n;
  };

  const svg = el('svg', { class: 'gd-svg', 'aria-hidden': 'true' });
  document.body.prepend(svg);
  // The leaf travels over the content (the trail stays behind it), so nothing hides it
  const over = el('svg', { class: 'gd-svg gd-over', 'aria-hidden': 'true' });
  document.body.append(over);

  let seed = 13;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const range = (a, b) => a + rnd() * (b - a);
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  const docY = (n) => n.getBoundingClientRect().top + window.scrollY;
  const docX = (n) => n.getBoundingClientRect().left + window.scrollX;

  // A smooth path through points (Catmull-Rom as cubic Béziers)
  const smoothD = (pts) => {
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };

  // Leaf images, from the sage leaf renderer (sage-leaf.js)
  const leafImgs = window.SageLeaf ? SageLeaf.make(8, SageLeaf.tones()) : [];
  const leafURL = (i, side = 'top') => (leafImgs[i] ? leafImgs[i][side].toDataURL() : '');

  let geo = null, path = null, samples = [], total = 0, stops = [], parts = {};
  let shown = 0, key = '';

  // ---- Laying it out ------------------------------------------------------------------------------
  function layout() {
    const W = document.documentElement.clientWidth;
    const container = main.querySelector('.container');
    const cl = container ? docX(container) : 24;
    const cw = container ? container.clientWidth : W - 48;
    const gutter = parseFloat(getComputedStyle(root).getPropertyValue('--gutter')) || 24;
    const top = docY(hero) + hero.offsetHeight - window.innerHeight * 0.15;
    const footer = document.querySelector('.site-footer');
    const bottom = footer ? docY(footer) - 40 : document.documentElement.scrollHeight - 200;
    const k = `${W}:${Math.round(top)}:${Math.round(bottom)}`;
    if (k === key) return false;
    key = k;
    // The lane: halfway into the page's margin, or a slim one on phones
    const lane = Math.max(10, cl * 0.5);
    const col = (cw - 3 * gutter) / 4;

    // Stops: each section's label, or where a section starts if it has none
    stops = Array.from(main.querySelectorAll(':scope > section.section')).map((sec) => {
      const label = sec.querySelector('.section-label:not(.is-center)');
      const anchor = label || sec.querySelector('.grow-stairs') || sec;
      const r = anchor.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY + (label ? r.height / 2 : 0), labelled: !!label };
    }).filter((s) => s.y > top && s.y < bottom);

    svg.setAttribute('width', W);
    svg.setAttribute('height', bottom - top);
    svg.setAttribute('viewBox', `0 ${top} ${W} ${bottom - top}`);
    [svg, over].forEach((n) => {
      n.setAttribute('width', W);
      n.setAttribute('height', bottom - top);
      n.setAttribute('viewBox', `0 ${top} ${W} ${bottom - top}`);
      Object.assign(n.style, { top: `${top}px`, width: `${W}px`, height: `${bottom - top}px` });
      n.textContent = '';
    });
    leaf = null;
    geo = { W, top, bottom, lane, cl, col };
    parts = {};
    seed = 13;
    BUILD[variant]();
    if (path) {
      total = path.getTotalLength();
      samples = [];
      for (let s = 0; s <= total; s += 6) {
        const p = path.getPointAtLength(s);
        samples.push([s, p.x, p.y]);
      }
    }
    return true;
  }

  // The path's length at which it first reaches page y (it runs downwards)
  const lengthAtY = (y) => {
    let lo = 0, hi = samples.length - 1;
    if (!samples.length) return 0;
    if (y <= samples[0][2]) return 0;
    if (y >= samples[hi][2]) return total;
    // Not strictly monotonic where it winds: take the furthest point not yet past y
    let best = 0;
    for (let i = 0; i < samples.length; i++) { if (samples[i][2] <= y) best = samples[i][0]; else if (samples[i][2] > y + 200) break; }
    return best;
  };
  const pointAt = (s) => {
    const i = Math.min(samples.length - 1, Math.max(1, Math.round(s / 6)));
    const a = samples[i - 1], b = samples[i];
    return [b[1], b[2], Math.atan2(b[2] - a[2], b[1] - a[1])];
  };

  // The stops' rings, filled once the guide has passed them
  function rings(r = 4.5) {
    parts.rings = stops.map((s) => {
      const g = el('g', { class: 'gd-stop' }, svg);
      el('circle', { cx: s.ringX, cy: s.y, r: r + 5, class: 'gd-halo' }, g);
      el('circle', { cx: s.ringX, cy: s.y, r, class: 'gd-ring' }, g);
      return { g, y: s.y };
    });
  }

  // A wandering route behind the content, like a map trail: long, gentle curves out across the
  // page and back, coming in to the left edge to pass just beside each stop
  function wander() {
    const { top, bottom, lane, W } = geo;
    const pts = [[W / 2, top], [W * 0.46, top + 140]];
    let y = top + 140, side = 1;
    const all = [...stops, { x: lane, y: bottom, end: true }];
    all.forEach((s) => {
      const gap = s.y - 90 - y;
      const n = Math.max(1, Math.round(gap / 620));
      for (let i = 1; i <= n; i++) {
        side = 1 - side;
        pts.push([W * (side ? range(0.62, 0.86) : range(0.22, 0.4)), y + (gap * i) / (n + 1) + range(-50, 50)]);
      }
      s.ringX = Math.max(lane, s.x - 18);
      if (!s.end) pts.push([lane + 30, s.y - 90], [s.ringX, s.y], [lane + 40, s.y + 90]);
      else pts.push([W * 0.5, s.y]);
      y = s.y + 90;
    });
    return pts;
  }

  // ---- The five -------------------------------------------------------------------------------------
  let leaf = null;
  function makeLeaf(size) {
    const g = el('g', { class: 'gd-leaf' }, over);
    const shadow = el('ellipse', { rx: size * 0.42, ry: size * 0.12, class: 'gd-shadow' }, g);
    const top = el('image', { href: leafURL(0), width: size, height: size * 0.425, x: -size * 0.12, y: -size * 0.2125 }, g);
    const under = el('image', { href: leafURL(0, 'under'), width: size, height: size * 0.425, x: -size * 0.12, y: -size * 0.2125, opacity: 0 }, g);
    return { g, shadow, top, under, size };
  }

  const BUILD = {
    leaftrail() {
      const pts = wander();
      el('path', { d: smoothD(pts), class: 'gd-trail-ahead' }, svg);
      path = el('path', { d: smoothD(pts), class: 'gd-trail' }, svg);
      rings();
      leaf = makeLeaf(geo.W < 761 ? 54 : 84);
    },
    leaf() {
      const pts = wander();
      path = el('path', { d: smoothD(pts), class: 'gd-none' }, svg);
      leaf = makeLeaf(geo.W < 761 ? 58 : 92);
    },
    thread() {
      const { top, bottom, lane } = geo;
      // Down the lane, a tick out to each stop
      path = el('path', { d: `M${lane},${top} L${lane},${bottom}`, class: 'gd-thread' }, svg);
      parts.ticks = stops.map((s) => {
        s.ringX = s.x - 10;
        const t = el('path', { d: `M${lane},${s.y} L${s.x - 10},${s.y}`, class: 'gd-tick' }, svg);
        return { t, y: s.y, len: Math.max(1, s.x - 10 - lane) };
      });
      parts.head = el('circle', { r: 3.5, class: 'gd-head' }, svg);
    },
    stem() {
      const { top, bottom, lane } = geo;
      const pts = [[lane, top]];
      for (let y = top + 90; y < bottom; y += 90) pts.push([lane + Math.sin(y * 0.011) * 5 + range(-1.5, 1.5), y]);
      pts.push([lane, bottom]);
      path = el('path', { d: smoothD(pts), class: 'gd-stem' }, svg);
      // A pair of leaves at each stop, and smaller pairs between them now and then
      const at = [...stops.map((s) => ({ y: s.y, big: true })), ...stops.slice(0, -1).map((s, i) => ({ y: (s.y + stops[i + 1].y) / 2, big: false }))];
      parts.pairs = at.map((p, i) => {
        const size = (p.big ? 72 : 46) * (geo.W < 761 ? 0.7 : 1);
        const g = el('g', { class: 'gd-pair', transform: `translate(${lane},${p.y})` }, svg);
        [-1, 1].forEach((side) => {
          el('image', {
            href: leafURL(i % 8, side < 0 && i % 3 === 2 ? 'under' : 'top'), width: size, height: size * 0.425, x: 0, y: -size * 0.2125,
            transform: `rotate(${side < 0 ? -60 : 20}) `, class: 'gd-pair-leaf',
          }, g);
        });
        return { g, y: p.y };
      });
      stops.forEach((s) => { s.ringX = s.x - 14; });
      parts.bud = el('circle', { r: 3.2, class: 'gd-bud' }, svg);
    },
    midrib() {
      const { top, bottom, W } = geo;
      const cx = W / 2;
      path = el('path', { d: `M${cx},${top} C${cx + 8},${top + (bottom - top) * 0.3} ${cx - 8},${top + (bottom - top) * 0.7} ${cx},${bottom}`, class: 'gd-midrib' }, svg);
      // At each stop a vein sweeps out each way from the midrib, forward and down, longest in the
      // middle of the page and shorter at the ends: by the bottom, one leaf the size of the page
      parts.veins = [];
      stops.forEach((s, i) => {
        const u = stops.length > 1 ? i / (stops.length - 1) : 0.5;
        const reach = (W / 2 - 24) * (0.35 + 0.65 * Math.sin(Math.PI * (0.12 + u * 0.8)));
        const y0 = s.y - 120;
        [-1, 1].forEach((dir) => {
          const d = `M${cx},${y0} C${cx + dir * reach * 0.35},${y0 + 20} ${cx + dir * reach * 0.8},${y0 + 90} ${cx + dir * reach},${y0 + 220}`;
          const v = el('path', { d, class: 'gd-vein' }, svg);
          const len = v.getTotalLength();
          v.style.strokeDasharray = `${len}`;
          v.style.strokeDashoffset = `${len}`;
          parts.veins.push({ v, y: y0, len });
        });
      });
    },
  };

  // ---- Following the scroll ---------------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!path || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    // Where the guide should have got to: 62% of the way down the screen
    const headY = window.scrollY + window.innerHeight * 0.62;
    const target = lengthAtY(headY);
    shown = reduced ? target : shown + (target - shown) * (1 - Math.pow(0.03, dt));
    const s = Math.max(0, shown);
    const [x, y, ang] = pointAt(s);

    if (variant === 'leaftrail' || variant === 'thread' || variant === 'stem' || variant === 'midrib') {
      path.style.strokeDasharray = `${total}`;
      path.style.strokeDashoffset = `${total - s}`;
    }
    if (leaf) {
      // Turning to its way, swaying, and over to its paler side now and then
      const sway = Math.sin(t * 1.6) * 0.35 + Math.sin(t * 0.7 + 1) * 0.2;
      const deg = ((ang + sway) * 180) / Math.PI;
      const lx = Math.min(Math.max(x, leaf.size * 0.7), geo.W - leaf.size * 0.7);
      leaf.g.setAttribute('transform', `translate(${lx.toFixed(1)},${y.toFixed(1)})`);
      // Mostly face-on, tilting now and then, and over only briefly
      const turn = Math.cos(t * 0.5 + s * 0.0025);
      const flip = turn > -0.85 ? 0.55 + 0.45 * Math.abs(turn) : turn;
      const sc = Math.max(0.2, Math.abs(flip));
      leaf.top.setAttribute('transform', `rotate(${deg.toFixed(1)}) scale(1 ${sc.toFixed(2)})`);
      leaf.under.setAttribute('transform', `rotate(${deg.toFixed(1)}) scale(1 ${sc.toFixed(2)})`);
      leaf.top.setAttribute('opacity', flip < 0 ? 0 : 1);
      leaf.under.setAttribute('opacity', flip < 0 ? 1 : 0);
      leaf.shadow.setAttribute('transform', `translate(10,16) rotate(${deg.toFixed(1)})`);
    }
    if (parts.rings) parts.rings.forEach((r) => r.g.classList.toggle('is-passed', r.y <= y + 2));
    if (parts.ticks) {
      parts.ticks.forEach((tk) => {
        const k = clamp01((y - tk.y) / 40);
        tk.t.style.strokeDasharray = `${tk.len}`;
        tk.t.style.strokeDashoffset = `${tk.len * (1 - k)}`;
      });
      parts.head.setAttribute('cx', x);
      parts.head.setAttribute('cy', y);
    }
    if (parts.pairs) {
      parts.pairs.forEach((p) => {
        const k = clamp01((y - p.y) / 90);
        const e = 1 - Math.pow(1 - k, 3);
        const sw = Math.sin(t * 1.2 + p.y * 0.01) * 4 * e;
        p.g.style.opacity = k > 0 ? 1 : 0;
        p.g.querySelectorAll('image').forEach((im, j) => {
          const base = j ? 20 : -60;
          im.setAttribute('transform', `rotate(${(base + (j ? -1 : 1) * 40 * (1 - e) + sw).toFixed(1)}) scale(${e.toFixed(3)})`);
        });
      });
      parts.bud.setAttribute('cx', x);
      parts.bud.setAttribute('cy', y);
    }
    if (parts.veins) {
      parts.veins.forEach((v) => {
        const k = clamp01((y - v.y) / 260);
        v.v.style.strokeDashoffset = `${v.len * (1 - (1 - Math.pow(1 - k, 2)))}`;
      });
    }
  }

  const relayout = () => { if (layout()) shown = Math.min(shown, total); };
  window.addEventListener('resize', relayout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();
  requestAnimationFrame(frame);
})();
