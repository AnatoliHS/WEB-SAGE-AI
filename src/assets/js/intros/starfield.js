// The star field shared by the Horizon and Prompt intros. Stars live in two slabs, above and below
// the eye (|y| from 1 to 4.5), between z 0.35 and 26, and come towards you along z; perspective
// (x / z, y / z) makes them dense and fine at the horizon and big and sparse up close. Each frame
// they're projected around the horizon, opened out by a slit, optionally bent along an S and
// rolled, moved onto the screen, and drawn in batches of the same size and brightness.
//
//   const field = SageStarfield.create(W, H);
//   field.draw(ctx, t, dt, { cx, cy, speed, ... })   // options below, with their defaults
window.SageStarfield = {
  create(W, H) {
    const f = H * 0.42;
    const count = Math.round(Math.min(5200, Math.max(1800, (W * H) / 260)));
    const Z_NEAR = 0.35, Z_FAR = 26;
    const spawn = (s, z) => {
      s.z = z;
      // Spread across a little more than the screen at that depth, so they fly out past its edges
      s.x = (Math.random() * 2 - 1) * z * (W * 0.62) / f;
    };
    const stars = [];
    for (let i = 0; i < count; i++) {
      const s = {
        // Most hug the slab's inner face, so the slit's edges read sharp
        y: (i % 2 ? 1 : -1) * (1 + Math.pow(Math.random(), 2.6) * 3.5),
        tw: Math.random() * Math.PI * 2,
        b: 0.55 + Math.random() * 0.45,
      };
      spawn(s, Z_NEAR + Math.random() * (Z_FAR - Z_NEAR));
      stars.push(s);
    }

    return {
      draw(ctx, t, dt, o) {
        const {
          cx, cy,            // the horizon's middle on screen
          speed = 1,         // depth units a second
          trail = 0,         // seconds of travel drawn as a streak (0: dots)
          gap = 0,           // px of dark slit either side of the horizon
          band = 1,          // how far the slabs open out (0–1)
          squash = 0,        // 1: flattened into the horizon line
          half = Infinity,   // as they flatten, they gather in to ±half px of cx
          rot = 0, sAmp = 0, sW = 1, // roll, and the S bend's height and width
          alpha = 1,
        } = o;
        if (alpha <= 0.002) return;
        const cos = Math.cos(rot), sin = Math.sin(rot);
        // Batches by brightness (11 steps) and width (1–8px)
        const buckets = new Map();
        const clampX = (v) => Math.max(-half, Math.min(half, v));

        for (const s of stars) {
          s.z -= speed * dt;
          if (s.z < Z_NEAR) spawn(s, Z_FAR * (0.9 + Math.random() * 0.1));

          const z = s.z;
          const z0 = z + speed * trail;
          // Local position around the horizon, then the tail of the streak
          let lx = (s.x * f) / z;
          let ly = (s.y * f) / z;
          let tx = (s.x * f) / z0;
          let ty = (s.y * f) / z0;
          const sign = s.y > 0 ? 1 : -1;
          ly = (ly * band + sign * gap) * (1 - squash);
          ty = (ty * band + sign * gap) * (1 - squash);
          if (squash > 0) {
            lx += (clampX(lx) - lx) * squash;
            tx += (clampX(tx) - tx) * squash;
          }
          if (sAmp > 0.5) {
            ly += sAmp * Math.tanh(lx / sW);
            ty += sAmp * Math.tanh(tx / sW);
          }
          const x1 = cx + lx * cos - ly * sin, y1 = cy + lx * sin + ly * cos;
          if (x1 < -40 || x1 > W + 40 || y1 < -40 || y1 > H + 40) continue;
          const x0 = cx + tx * cos - ty * sin, y0 = cy + tx * sin + ty * cos;

          // Diameter: a pixel at the horizon, up to 7 close by
          const size = Math.min(7, Math.max(1, 5 / Math.pow(z, 0.85)));
          const a = Math.min(1, Math.max(0.35, 2.6 / Math.pow(z, 0.55))) * s.b * (0.82 + 0.18 * Math.sin(t * 0.004 + s.tw));
          const key = Math.min(10, Math.round(a * alpha * 10)) * 8 + Math.min(7, Math.round(size) - 1);
          let path = buckets.get(key);
          if (!path) buckets.set(key, (path = new Path2D()));
          path.moveTo(x0, y0);
          // A dot when the streak is shorter than it is wide
          if (Math.abs(x1 - x0) + Math.abs(y1 - y0) < size * 0.6) path.lineTo(x0 + 0.01, y0);
          else path.lineTo(x1, y1);
        }

        ctx.lineCap = 'round';
        ctx.strokeStyle = '#fff';
        buckets.forEach((path, key) => {
          const a = Math.floor(key / 8) / 10;
          if (a <= 0) return;
          ctx.globalAlpha = a;
          ctx.lineWidth = (key % 8) + 1;
          ctx.stroke(path);
        });
        ctx.globalAlpha = 1;
      },
    };
  },
};
