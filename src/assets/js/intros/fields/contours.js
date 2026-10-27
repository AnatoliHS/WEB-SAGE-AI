// Prompt field · Contours: a topographic map ("a place the maps don't show"), its height lines
// slowly shifting and ringing the input like a summit. On send the land levels out: the rings
// straighten into level lines either side of the input, which close up into the line as it
// stretches to the rule.
window.SagePromptField = {
  create(W, H, { pillW = 860, pillH = 78 } = {}) {
    const small = W < 600;
    const cell = small ? 11 : 15;
    const cols = Math.ceil(W / cell) + 1;
    const rows = Math.ceil(H / cell) + 1;
    const val = new Float32Array(cols * rows);
    const STEP = 0.075;

    // A few hills and hollows, drifting
    const hills = Array.from({ length: small ? 4 : 6 }, () => ({
      x: Math.random() * W,
      y: Math.random() < 0.5 ? Math.random() * H * 0.3 : H * (0.7 + Math.random() * 0.3),
      s: Math.min(W, H) * (0.12 + Math.random() * 0.16),
      a: (Math.random() < 0.75 ? 1 : -0.6) * (0.5 + Math.random() * 0.6),
      p: Math.random() * 6.28,
    }));
    const rx = pillW / 2 + 60, ry = pillH / 2 + 50;

    return {
      draw(ctx, t, dt, o) {
        const s = t / 1000;
        const level = o.warp;
        for (let j = 0; j < rows; j++) {
          const y = j * cell;
          for (let i = 0; i < cols; i++) {
            const x = i * cell;
            let v = 0.12 * Math.sin(x * 0.004 + s * 0.25) * Math.cos(y * 0.005 - s * 0.18);
            for (const h of hills) {
              const dx = x - h.x - Math.sin(s * 0.3 + h.p) * 30;
              const dy = y - h.y - Math.cos(s * 0.25 + h.p) * 20;
              v += h.a * Math.exp(-(dx * dx + dy * dy) / (2 * h.s * h.s));
            }
            // The summit the input sits on
            const ex = (x - W / 2) / rx, ey = (y - H / 2) / ry;
            v += 1.3 * Math.exp(-(ex * ex + ey * ey) * 0.35);
            // Levelled: lines parallel to the horizon
            const flat = 1.4 - Math.abs(y - H / 2) / (H * 0.32);
            val[j * cols + i] = v + (flat - v) * level;
          }
        }

        // Where a map point lands: about the horizon, flattened and gathered as it closes up
        const fold = 1 - o.squash;
        const gather = 1 - (1 - o.half / (W / 2)) * o.squash;
        const X = (x) => o.cx + (x - W / 2) * gather;
        const Y = (y) => o.cy + (y - H / 2) * fold;

        const fine = new Path2D();
        const bold = new Path2D();
        const edge = (a, b, l) => (l - a) / (b - a || 1e-6);
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const a = val[j * cols + i], b = val[j * cols + i + 1];
            const c = val[(j + 1) * cols + i + 1], d = val[(j + 1) * cols + i];
            const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
            const x = i * cell, y = j * cell;
            for (let k = Math.ceil(lo / STEP); k * STEP <= hi; k++) {
              const l = k * STEP;
              // The crossings on this cell's four sides, joined in pairs
              const pts = [];
              if ((a < l) !== (b < l)) pts.push(x + edge(a, b, l) * cell, y);
              if ((b < l) !== (c < l)) pts.push(x + cell, y + edge(b, c, l) * cell);
              if ((d < l) !== (c < l)) pts.push(x + edge(d, c, l) * cell, y + cell);
              if ((a < l) !== (d < l)) pts.push(x, y + edge(a, d, l) * cell);
              const path = k % 5 === 0 ? bold : fine;
              for (let p = 0; p + 3 < pts.length; p += 4) {
                path.moveTo(X(pts[p]), Y(pts[p + 1]));
                path.lineTo(X(pts[p + 2]), Y(pts[p + 3]));
              }
            }
          }
        }
        ctx.lineWidth = 1;
        ctx.globalAlpha = o.alpha;
        ctx.strokeStyle = 'rgba(244, 237, 221, 0.11)';
        ctx.stroke(fine);
        ctx.strokeStyle = 'rgba(169, 186, 134, 0.42)';
        ctx.stroke(bold);
        ctx.globalAlpha = 1;
      },
    };
  },
};
