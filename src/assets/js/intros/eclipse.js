// Intro · Eclipse (journey, concepts/journeys.njk). In the dark, a ring of violet light draws itself
// round a black disc, an eclipse; at the bottom of it the diamond ring flashes; then the ring sinks
// to the hero rule and flattens into it, white-hot, cooling to the ink as SAGE.IS rises out of it.
SageIntro.run({
  background: 'rgb(var(--ground-3, 6, 5, 12))',
  brandAt: 2350,
  duration: 3000,

  setup(api) {
    const css = getComputedStyle(api.intro);
    const trip = (n, fb) => (css.getPropertyValue(n).trim() || fb).split(',').map(Number);
    this.c = { g1: trip('--ground-1', '24, 18, 44'), g3: trip('--ground-3', '6, 5, 12'), glow: trip('--glow', '151, 26, 255') };
  },

  frame(t, api) {
    const { ctx, span, lerp, ease, g } = api;
    const { W, H, rule } = g;
    const c = this.c;
    const rgba = (v, a) => `rgba(${v[0]}, ${v[1]}, ${v[2]}, ${a})`;

    ctx.fillStyle = rgba(c.g3, 1);
    ctx.fillRect(0, 0, W, H);

    const r0 = Math.min(W, H) * 0.2;
    const sweep = ease.out(span(t, 150, 1250));
    const m = ease.inOut(span(t, 1500, 2250));
    const cool = span(t, 2250, 2800);
    const cx = lerp(W / 2, rule.x + rule.w / 2, m);
    const cy = lerp(H / 2, rule.y + rule.h / 2, m);
    const rx = lerp(r0, rule.w / 2, m);
    const ry = Math.max(lerp(r0, rule.h / 2, m), 0.5);

    // The halo round the ring, gone as it flattens
    if (m < 1) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, ry / rx);
      const halo = ctx.createRadialGradient(0, 0, rx * 0.9, 0, 0, rx * 2.2);
      halo.addColorStop(0, rgba(c.glow, 0.28 * sweep * (1 - m)));
      halo.addColorStop(1, rgba(c.glow, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(-rx * 3, -rx * 3, rx * 6, rx * 6);
      ctx.restore();
      // The moon
      ctx.fillStyle = rgba(c.g3, 1);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.985, ry * 0.985, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // The ring: drawn round, then white-hot as a line, cooling to the ink
    const grad = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    grad.addColorStop(0, '#302aff');
    grad.addColorStop(1, '#971aff');
    ctx.save();
    ctx.lineWidth = lerp(2.5, rule.h, m);
    ctx.shadowColor = rgba(c.glow, 0.9 * (1 - cool));
    ctx.shadowBlur = 26 * (1 - cool);
    ctx.strokeStyle = m > 0.6 ? `rgba(${Math.round(lerp(255, 241, cool))}, ${Math.round(lerp(250, 238, cool))}, 255, 1)` : grad;
    ctx.beginPath();
    if (m > 0.98) {
      ctx.moveTo(rule.x, rule.y + rule.h / 2);
      ctx.lineTo(rule.x + rule.w, rule.y + rule.h / 2);
    } else {
      ctx.ellipse(cx, cy, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sweep);
    }
    ctx.stroke();
    ctx.restore();

    // The diamond ring, at the bottom of the eclipse
    const flash = Math.sin(Math.PI * span(t, 1100, 1700));
    if (flash > 0) {
      const dx = cx, dy = cy + ry;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const d = ctx.createRadialGradient(dx, dy, 0, dx, dy, 60 * flash);
      d.addColorStop(0, `rgba(255, 255, 255, ${flash})`);
      d.addColorStop(0.2, rgba(c.glow, 0.6 * flash));
      d.addColorStop(1, rgba(c.glow, 0));
      ctx.fillStyle = d;
      ctx.fillRect(dx - 70, dy - 70, 140, 140);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * flash})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(dx - 110 * flash, dy);
      ctx.lineTo(dx + 110 * flash, dy);
      ctx.moveTo(dx, dy - 50 * flash);
      ctx.lineTo(dx, dy + 50 * flash);
      ctx.stroke();
      ctx.restore();
    }
  },
});
