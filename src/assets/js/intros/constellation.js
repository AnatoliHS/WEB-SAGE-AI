// Intro 2 · Constellation. A loose network of nodes drifts on the page's ground, linked where
// they come close, like a neural net thinking. Then every point flies, left to right, to its
// place in SAGE.IS and the rule, drawn from the hero's own wordmark, so the name is
// assembled out of the network; the real wordmark fades in over the points and they go.
SageIntro.run({
  brandAt: 2150,
  instantBrand: true,
  duration: 2750,

  setup(api) {
    const { W, H, rule, fontSize } = api.g;
    // Draw the wordmark off screen exactly where the hero has it, and sample its ink on a grid
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const o = off.getContext('2d');
    o.fillStyle = '#fff';
    api.letters().forEach((l) => {
      o.font = `400 ${l.size}px Anton, Impact, sans-serif`;
      o.fillText(l.ch, l.x, l.baseline);
    });
    const step = Math.max(4, Math.round(fontSize / 34));
    const data = o.getImageData(0, 0, W, H).data;
    const markEnd = api.letters().reduce((m, l) => Math.max(m, l.x + l.w), 0);
    const accentFrom = (api.letters().find((l) => l.accent) || { x: Infinity }).x;
    let targets = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < Math.min(W, markEnd + step); x += step) {
        if (data[(y * W + x) * 4 + 3] > 128) targets.push({ x, y, accent: x >= accentFrom - 2 });
      }
    }
    // Keep it to a count any device animates smoothly
    const MAX = 1500;
    if (targets.length > MAX) targets = targets.sort(() => Math.random() - 0.5).slice(0, MAX);
    for (let x = rule.x; x <= rule.x + rule.w; x += step * 1.4) targets.push({ x, y: rule.y + rule.h / 2, rule: true });

    const pts = targets.map((tg, i) => ({
      tg,
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.5) * 18,
      // The first ones are the network's nodes, the rest are dust between them
      hub: i < 140,
      // Set off left to right, so the name is written
      delay: (tg.x / W) * 520 + Math.random() * 120,
    }));
    this.s = { pts, step, last: 0 };
  },

  frame(t, api) {
    const { ctx, g, span, lerp, ease } = api;
    const { W, H, rule } = g;
    const st = this.s;
    const dt = Math.min(0.05, (t - st.last) / 1000);
    st.last = t;

    ctx.clearRect(0, 0, W, H);
    const fadeIn = ease.out(span(t, 0, 500));
    const links = fadeIn * (1 - span(t, 900, 1500));
    const out = span(t, 2250, 2650);

    // Where each point is now
    for (const p of st.pts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = ease.inOut(span(t, 750 + p.delay, 1650 + p.delay));
      // Arc in, rather than slide straight
      const arc = Math.sin(Math.PI * k) * 60;
      p.sx = lerp(p.x, p.tg.x, k) + arc * 0.4;
      p.sy = lerp(p.y, p.tg.y, k) - arc;
      p.k = k;
    }

    // Links between nodes near each other
    if (links > 0.01) {
      ctx.lineWidth = 1;
      const hubs = st.pts.filter((p) => p.hub);
      const D = Math.min(W, H) * 0.2;
      for (let i = 0; i < hubs.length; i++) {
        for (let j = i + 1; j < hubs.length; j++) {
          const a = hubs[i], b = hubs[j];
          const d = Math.hypot(a.sx - b.sx, a.sy - b.sy);
          if (d > D) continue;
          ctx.strokeStyle = `rgba(143, 134, 255, ${(1 - d / D) * 0.45 * links})`;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        }
      }
    }

    // The points: nodes bright, dust faint, all growing to fill the letters as they land
    const land = st.step * 0.42;
    for (const p of st.pts) {
      const r = lerp(p.hub ? 2 : 1, land, p.k);
      const a = (p.hub ? 1 : lerp(0.35, 1, p.k)) * fadeIn * (1 - out);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.tg.accent && p.k > 0.5 ? '#7a3cff' : p.hub && p.k < 0.5 ? '#b3acff' : '#eee9e2';
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // The rule settles solid under the points once they're in
    const solid = span(t, 2000, 2350);
    if (solid > 0) {
      ctx.globalAlpha = solid;
      ctx.fillStyle = '#eee9e2';
      ctx.fillRect(rule.x, rule.y, rule.w, rule.h);
      ctx.globalAlpha = 1;
    }
  },
});
