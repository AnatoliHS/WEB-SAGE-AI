// Prompt field · Leaves: sage leaves blowing across the screen on a gusting wind, tumbling as they
// go, near ones big and quick, far ones small and faint. On send the wind picks up and sweeps them
// into the line as it stretches to the rule, where they flatten out along it and vanish.
window.SagePromptField = {
  create(W, H) {
    // A sage leaf, drawn once per shade (64 × 26, pointing along +x) at 2x, then stamped
    const shades = [[169, 186, 134], [143, 160, 112], [195, 204, 166], [116, 134, 88], [207, 190, 104]];
    const sprites = shades.map((c) => {
      const cv = document.createElement('canvas');
      cv.width = 128;
      cv.height = 52;
      const g = cv.getContext('2d');
      g.scale(2, 2);
      g.beginPath();
      g.moveTo(5, 13);
      g.bezierCurveTo(14, 1.5, 44, 0, 63, 13);
      g.bezierCurveTo(44, 26, 14, 24.5, 5, 13);
      const fill = g.createLinearGradient(0, 0, 0, 26);
      fill.addColorStop(0, `rgb(${c.map((v) => Math.min(255, v + 26)).join(',')})`);
      fill.addColorStop(1, `rgb(${c.map((v) => v - 22).join(',')})`);
      g.fillStyle = fill;
      g.fill();
      // Stalk, midrib and a few veins
      g.strokeStyle = 'rgba(244, 237, 221, 0.32)';
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(0, 13.6);
      g.quadraticCurveTo(30, 12.2, 60, 13);
      for (let i = 0; i < 5; i++) {
        const x = 14 + i * 9;
        g.moveTo(x, 12.8);
        g.lineTo(x + 7, 12.8 - (7 - i));
        g.moveTo(x, 13.2);
        g.lineTo(x + 7, 13.2 + (7 - i));
      }
      g.stroke();
      return cv;
    });

    const small = W < 600;
    const count = small ? 34 : 72;
    const leaves = Array.from({ length: count }, () => {
      const z = 0.2 + Math.random() * 0.8;
      return {
        // Already in the air when it starts
        x: (Math.random() * 1.2 - 0.1) * W,
        y: Math.random() * H,
        z,
        size: (0.36 + z * 0.9) * (small ? 0.62 : 1),
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 2.4,
        flip: Math.random() * Math.PI * 2,
        flipRate: 1.5 + Math.random() * 3,
        ph: Math.random() * Math.PI * 2,
        flutter: 0.7 + Math.random() * 0.9,
        img: sprites[Math.floor(Math.random() * sprites.length)],
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
          l.y += (Math.sin(s * l.flutter * 2 + l.ph) * 55 * l.z + 14) * dt * (1 - o.warp);
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
          ctx.globalAlpha = (0.32 + 0.68 * l.z) * o.alpha;
          ctx.save();
          ctx.translate(l.x, y);
          ctx.rotate(rot);
          ctx.scale(sx, sy || 0.001);
          ctx.drawImage(l.img, -32, -13, 64, 26);
          ctx.restore();
        });
        ctx.globalAlpha = 1;
      },
    };
  },
};
