// Prompt field · Leaves: sage leaves blowing across the screen on a gusting wind, tumbling as they
// go, near ones big and quick, far ones small and faint. On send the wind picks up and sweeps them
// into the line as it stretches to the rule, where they flatten out along it and vanish.
window.SagePromptField = {
  create(W, H) {
    // Real sage leaves, top and silvery underside, and a softened copy for the far ones (sage-leaf.js)
    const sprites = SageLeaf.make(8, SageLeaf.tones());
    // With --leaf-flow (style.css), they ride a wave as they blow, rather than fluttering
    const flow = getComputedStyle(document.documentElement).getPropertyValue('--leaf-flow').trim() === '1';

    const small = W < 600;
    const count = small ? 34 : 72;
    const leaves = Array.from({ length: count }, () => {
      const z = 0.2 + Math.random() * 0.8;
      return {
        // Already in the air when it starts
        x: (Math.random() * 1.2 - 0.1) * W,
        y: Math.random() * H,
        z,
        size: (0.36 + z * 1.1) * (small ? 0.62 : 1),
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 2.4,
        flip: Math.random() * Math.PI * 2,
        flipRate: 1.5 + Math.random() * 3,
        ph: Math.random() * Math.PI * 2,
        flutter: 0.7 + Math.random() * 0.9,
        leaf: sprites[Math.floor(Math.random() * sprites.length)],
      };
    }).sort((a, b) => a.z - b.z);

    return {
      draw(ctx, t, dt, o) {
        const s = t / 1000;
        // Gusting wind, stronger on send
        const gust = 1 + 0.35 * Math.sin(s * 1.1) + 0.2 * Math.sin(s * 2.7 + 1);
        const boost = 1 + 5 * o.warp + 8 * o.rush;
        const pull = Math.min(1, dt * 7 * o.warp);
        leaves.forEach((l) => {
          l.x += (70 + 150 * l.z) * gust * boost * dt;
          l.y += (flow
            ? Math.cos(l.x * 0.005 + l.ph) * 90 * l.z
            : Math.sin(s * l.flutter * 2 + l.ph) * 55 * l.z + 14) * dt * (1 - o.warp);
          // On send, drawn in to the line
          l.y += (o.cy - l.y) * pull;
          l.rot += l.spin * dt * (1 + 2 * o.warp);
          l.flip += l.flipRate * dt;
          if (l.x > W + 70) {
            l.x = -70 - Math.random() * 120;
            l.y = Math.random() * H;
          }
          if (l.y > H + 60) l.y = -60;

          const y = o.cy + (l.y - o.cy) * (1 - o.squash);
          // Lying along the wind, and stretched, as it rushes
          const rot = l.rot * (1 - o.warp);
          const sx = l.size * (1 + 1.6 * o.rush);
          const sy = l.size * Math.cos(l.flip) * (1 - o.warp * 0.4) * (1 - 0.85 * o.squash);
          ctx.globalAlpha = (0.45 + 0.55 * l.z) * o.alpha;
          ctx.save();
          ctx.translate(l.x, y);
          ctx.rotate(rot);
          ctx.scale(sx, sy || 0.001);
          // Its underside as it turns over; out of focus when far
          const img = Math.cos(l.flip) < 0 ? l.leaf.under : l.z < 0.42 ? l.leaf.soft : l.leaf.top;
          ctx.drawImage(img, -SageLeaf.W / 2, -SageLeaf.H / 2, SageLeaf.W, SageLeaf.H);
          ctx.restore();
        });
        ctx.globalAlpha = 1;
      },
    };
  },
};
