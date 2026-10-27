// Prompt field · Fireflies: low mist drifting through the dark (Ironhill's "watch the mist sit
// low") and fireflies wandering in it, blinking. On send they fly to the input's line and string
// out along it, lighting it, as it stretches to the rule; the mist clears.
window.SagePromptField = {
  create(W, H) {
    const small = W < 600;
    const blob = (rgb, size) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = size;
      const g = cv.getContext('2d');
      const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      r.addColorStop(0, `rgba(${rgb}, 1)`);
      r.addColorStop(0.35, `rgba(${rgb}, 0.35)`);
      r.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = r;
      g.fillRect(0, 0, size, size);
      return cv;
    };
    const mistImg = blob('207, 208, 192', 256);
    const glowImg = blob('254, 210, 70', 64);

    // Mist: wide, soft banks, most of them low
    const mist = Array.from({ length: small ? 6 : 10 }, (_, i) => ({
      x: Math.random() * W,
      y: H * (i < 2 ? 0.2 + Math.random() * 0.2 : 0.62 + Math.random() * 0.42),
      w: W * (0.5 + Math.random() * 0.6),
      h: H * (0.14 + Math.random() * 0.16),
      v: 10 + Math.random() * 22,
      a: 0.05 + Math.random() * 0.05,
    }));

    const n = small ? 28 : 56;
    const flies = Array.from({ length: n }, (_, i) => ({
      hx: Math.random() * W,
      hy: Math.random() * H,
      a1: 20 + Math.random() * 50, f1: 0.3 + Math.random() * 0.5, p1: Math.random() * 6.28,
      a2: 10 + Math.random() * 30, f2: 0.6 + Math.random() * 0.8, p2: Math.random() * 6.28,
      blink: 0.6 + Math.random() * 1.1, pb: Math.random() * 6.28,
      r: (small ? 1 : 1.3) + Math.random() * 1.4,
      // Its place on the line, and how late it sets off
      slot: (i + 0.5) / n + (Math.random() - 0.5) * 0.6 / n,
      lag: Math.random() * 0.45,
      px: 0, py: 0,
    }));

    return {
      draw(ctx, t, dt, o) {
        const s = t / 1000;
        ctx.globalCompositeOperation = 'lighter';

        // Mist, thinning on send and flattening with the line
        mist.forEach((m) => {
          m.x += m.v * dt;
          if (m.x - m.w / 2 > W) m.x = -m.w / 2;
          const y = o.cy + (m.y - H / 2) * (1 - o.squash);
          ctx.globalAlpha = m.a * o.alpha * (1 - o.warp * 0.8);
          ctx.drawImage(mistImg, m.x - m.w / 2, y - m.h / 2, m.w, m.h * (1 - 0.8 * o.squash));
        });

        flies.forEach((f) => {
          const wx = f.hx + Math.sin(s * f.f1 + f.p1) * f.a1 + Math.sin(s * f.f2 + f.p2) * f.a2;
          const wy = f.hy + Math.cos(s * f.f1 * 0.8 + f.p2) * f.a1 * 0.6 + Math.sin(s * f.f2 * 1.2 + f.p1) * f.a2;
          // Flight to the line, each a little after the last
          const k = Math.min(Math.max((o.warp * 1.45 - f.lag) / 0.8, 0), 1);
          const go = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          const tx = o.cx - o.half + f.slot * o.half * 2;
          const x = wx + (tx - wx) * go;
          const y = wy + (o.cy - wy) * go;
          const lit = Math.pow(Math.max(0, Math.sin(s * f.blink * 3 + f.pb)), 3) * 0.85 + 0.15;
          const b = (lit + (1 - lit) * go) * o.alpha;

          // A streak behind it while it flies
          if (go > 0 && go < 1 && f.px) {
            ctx.globalAlpha = 0.5 * b;
            ctx.strokeStyle = 'rgb(254, 210, 70)';
            ctx.lineWidth = f.r;
            ctx.beginPath();
            ctx.moveTo(f.px, f.py);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          f.px = x;
          f.py = y;
          const g = f.r * 12;
          ctx.globalAlpha = 0.55 * b;
          ctx.drawImage(glowImg, x - g / 2, y - g / 2, g, g);
          ctx.globalAlpha = b;
          ctx.fillStyle = 'rgb(255, 244, 196)';
          ctx.beginPath();
          ctx.arc(x, y, f.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      },
    };
  },
};
