// Intro · Ripple (journey, concepts/journeys.njk). Dark water, seen at a low angle. A single drop of
// light falls and strikes the middle; rings spread out from it; the widest settles onto the hero
// rule and draws tight into it, white-hot, cooling to the ink as SAGE.IS rises out of it.
SageIntro.run({
  background: 'rgb(var(--ground-3, 5, 4, 14))',
  brandAt: 2350,
  duration: 3000,

  setup(api) {
    const css = getComputedStyle(api.intro);
    const trip = (n, fb) => (css.getPropertyValue(n).trim() || fb).split(',').map(Number);
    this.c = { g1: trip('--ground-1', '20, 18, 52'), g3: trip('--ground-3', '5, 4, 14'), lens: trip('--lens', '110, 50, 255'), glow: trip('--glow', '151, 26, 255') };
  },

  frame(t, api) {
    const { ctx, span, lerp, ease, g } = api;
    const { W, H, rule } = g;
    const c = this.c;
    const rgba = (v, a) => `rgba(${v[0]}, ${v[1]}, ${v[2]}, ${a})`;
    const cx = W / 2, cy = H * 0.52;

    // Water: lighter towards the middle
    const ground = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(W, H) / 2);
    ground.addColorStop(0, rgba(c.g1, 1));
    ground.addColorStop(1, rgba(c.g3, 1));
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // The drop, falling
    const fall = span(t, 100, 650);
    if (fall < 1) {
      const y = lerp(-30, cy, ease.in(fall));
      const streak = ctx.createLinearGradient(cx, y - 70, cx, y);
      streak.addColorStop(0, rgba(c.glow, 0));
      streak.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
      ctx.strokeStyle = streak;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, y - 70);
      ctx.lineTo(cx, y);
      ctx.stroke();
    }
    // The splash of light where it lands
    const hit = Math.sin(Math.PI * span(t, 650, 1050));
    if (hit > 0) {
      const s = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      s.addColorStop(0, `rgba(255, 255, 255, ${0.8 * hit})`);
      s.addColorStop(0.25, rgba(c.glow, 0.5 * hit));
      s.addColorStop(1, rgba(c.glow, 0));
      ctx.fillStyle = s;
      ctx.fillRect(cx - 130, cy - 130, 260, 260);
    }

    // Rings, spreading; the first (widest) one goes on to become the rule
    const m = ease.inOut(span(t, 1450, 2250));
    const cool = span(t, 2250, 2800);
    const grow = (t0) => Math.max(0, t - t0) * 0.42 * (W / 1440 + 0.4);
    [650, 820, 990, 1160].forEach((t0, i) => {
      if (t < t0) return;
      let rx = grow(t0), ry = rx * 0.3, x = cx, y = cy;
      let a = Math.max(0, 1 - (t - t0) / 1900);
      if (i === 0) {
        const rx0 = grow(t0);
        rx = lerp(rx0, rule.w / 2, m);
        ry = Math.max(lerp(rx0 * 0.3, rule.h / 2, m), 0.5);
        x = lerp(cx, rule.x + rule.w / 2, m);
        y = lerp(cy, rule.y + rule.h / 2, m);
        a = lerp(a, 1, m);
      } else {
        a *= 1 - m;
      }
      if (a <= 0) return;
      ctx.lineWidth = i === 0 ? lerp(1.6, rule.h, m) : 1.4;
      ctx.shadowColor = rgba(c.glow, 0.8 * (1 - cool));
      ctx.shadowBlur = i === 0 ? 20 * (1 - cool) : 8;
      ctx.strokeStyle = i === 0 && m > 0.5
        ? `rgba(${Math.round(lerp(255, 241, cool))}, ${Math.round(lerp(250, 238, cool))}, 255, ${a})`
        : rgba(i % 2 ? c.lens : c.glow, a * 0.9);
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  },
});
