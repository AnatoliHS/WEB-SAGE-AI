// Prompt field · Meadow: grass under the input, waves of wind running through it, with pollen
// drifting in the air above. On send a gust lays the grass over and it sinks away, while the
// pollen is drawn into the line as it stretches to the rule.
window.SagePromptField = {
  create(W, H, { pillH = 78 } = {}) {
    const small = W < 600;
    const tall = H / 2 - pillH / 2 - 28;
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const MOSS = [44, 56, 34], SAGE = [169, 186, 134];

    const blades = Array.from({ length: small ? 150 : 340 }, () => {
      const z = Math.random();
      const c = mix(MOSS, SAGE, 0.15 + z * 0.85);
      return {
        x: Math.random() * (W + 40) - 20,
        z,
        h: tall * (0.25 + Math.pow(Math.random(), 0.7) * 0.75) * (0.55 + 0.45 * z),
        w: (small ? 1.6 : 2.2) + z * (small ? 2.2 : 3.4),
        lean: (Math.random() - 0.3) * 0.3,
        color: `rgb(${c.join(',')})`,
      };
    }).sort((a, b) => a.z - b.z);

    const pollen = Array.from({ length: small ? 22 : 44 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.9,
      v: 12 + Math.random() * 26,
      p: Math.random() * 6.28,
      r: 0.8 + Math.random() * 1.4,
      slot: (i + 0.5) / (small ? 22 : 44),
      sun: Math.random() < 0.6,
    }));

    return {
      draw(ctx, t, dt, o) {
        const s = t / 1000;
        // The meadow sinks away on send
        const sink = H * 0.7 * o.squash + H * 0.08 * o.warp;
        const base = H + 6 + sink;
        ctx.globalAlpha = o.alpha;
        blades.forEach((b) => {
          // Waves of wind running across, and the send's gust laying it over
          const wind = 0.5 * Math.sin(b.x * 0.0045 - s * 2.1) + 0.28 * Math.sin(b.x * 0.012 - s * 3.3) + 0.2;
          const bend = (b.lean + wind * 0.45 + 1.6 * o.warp) * (0.6 + 0.4 * b.z);
          const dx = bend * b.h;
          const top = base - b.h * (1 - Math.min(Math.abs(bend), 1.1) * 0.32);
          const mid = base - b.h * 0.55;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.moveTo(b.x - b.w / 2, base);
          ctx.quadraticCurveTo(b.x + dx * 0.25 - b.w * 0.2, mid, b.x + dx, top);
          ctx.quadraticCurveTo(b.x + dx * 0.25 + b.w * 0.5, mid, b.x + b.w / 2, base);
          ctx.fill();
        });

        // Pollen, drifting, then drawn in to the line
        ctx.globalCompositeOperation = 'lighter';
        pollen.forEach((p) => {
          p.x += p.v * dt * (1 + 3 * o.warp);
          if (p.x > W + 10) p.x = -10;
          const wy = p.y + Math.sin(s * 1.4 + p.p) * 14;
          const k = Math.min(o.warp * 1.3, 1);
          const go = k * k * (3 - 2 * k);
          const x = p.x + (o.cx - o.half + p.slot * o.half * 2 - p.x) * go;
          const y = wy + (o.cy - wy) * go;
          ctx.globalAlpha = o.alpha * (0.55 + 0.45 * Math.sin(s * 2 + p.p) ** 2);
          ctx.fillStyle = p.sun ? 'rgb(254, 214, 90)' : 'rgb(244, 237, 221)';
          ctx.beginPath();
          ctx.arc(x, y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      },
    };
  },
};
