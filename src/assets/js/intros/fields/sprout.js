// Prompt field · Sprout: sage sprigs grow in from the top and bottom of the screen towards the
// input, putting out their leaves in opposite pairs as they climb (each pair turned a quarter to
// the last, as sage grows), and sway. On send they fold flat into the line as it stretches to the
// rule.
window.SagePromptField = {
  create(W, H, { pillH = 78 } = {}) {
    const small = W < 600;
    const leafPath = (g, len, wid) => {
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(len * 0.2, -wid, len * 0.7, -wid * 0.9, len, 0);
      g.bezierCurveTo(len * 0.7, wid * 0.9, len * 0.2, wid, 0, 0);
    };
    const shades = ['rgb(169,186,134)', 'rgb(143,160,112)', 'rgb(186,196,156)', 'rgb(122,140,94)'];

    const n = small ? 8 : 16;
    const reach = H / 2 - pillH / 2 - 26;
    const stems = Array.from({ length: n }, (_, i) => {
      const up = i % 2 === 0;
      return {
        up,
        x0: ((i + 0.5) / n) * W + (Math.random() - 0.5) * (W / n) * 0.8,
        len: reach * (0.38 + Math.random() * 0.58),
        bend: (Math.random() - 0.5) * (small ? 50 : 110),
        ph: Math.random() * Math.PI * 2,
        delay: Math.random() * 450,
        leaf: (small ? 11 : 17) * (0.8 + Math.random() * 0.4),
        shade: shades[i % shades.length],
      };
    });

    return {
      draw(ctx, t, dt, o) {
        const s = t / 1000;
        const sway = 1 + 3 * o.warp;
        const fold = 1 - o.squash;
        // Where a point of the plant lands: about the horizon, flattened and gathered as it folds
        const gather = 1 - (1 - o.half / (W / 2)) * o.squash;
        const at = (x, y) => [o.cx + (x - W / 2) * gather, o.cy + (y - H / 2) * fold];

        ctx.globalAlpha = o.alpha;
        ctx.lineCap = 'round';
        stems.forEach((st) => {
          const grow = 1 - Math.pow(1 - Math.min(Math.max((t - st.delay) / 1300, 0), 1), 3);
          if (grow <= 0) return;
          const dir = st.up ? -1 : 1;
          const y0 = st.up ? H + 6 : -6;
          const point = (u) => {
            const x = st.x0 + st.bend * u * u + Math.sin(s * 1.3 + st.ph + u * 1.5) * 9 * u * u * sway;
            return at(x, y0 + dir * u * st.len);
          };

          // Stem
          ctx.strokeStyle = 'rgba(169, 186, 134, 0.55)';
          ctx.lineWidth = small ? 1.2 : 1.6;
          ctx.beginPath();
          for (let k = 0; k <= 18; k++) {
            const [x, y] = point((k / 18) * grow);
            if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();

          // Leaf pairs, opening as the stem passes them, smaller towards the tip
          ctx.fillStyle = st.shade;
          for (let k = 0, u = 0.14; u < grow; k++, u += 0.13) {
            const open = Math.min((grow - u) / 0.12, 1);
            const [x, y] = point(u);
            const [x2, y2] = point(Math.min(u + 0.02, 1));
            const ang = Math.atan2(y2 - y, x2 - x);
            const len = st.leaf * (1 - u * 0.55) * open;
            // Every other pair faces you edge-on, a quarter turn round the stem
            const wid = len * (k % 2 ? 0.2 : 0.36);
            [-1, 1].forEach((side) => {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(ang + side * 0.95);
              ctx.scale(1, fold || 0.001);
              leafPath(ctx, len, wid);
              ctx.fill();
              ctx.restore();
            });
          }
          // A bud at the tip
          const [tx, ty] = point(grow);
          ctx.beginPath();
          ctx.arc(tx, ty, (small ? 1.6 : 2.2) * fold + 0.4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(254, 200, 32, 0.85)';
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      },
    };
  },
};
