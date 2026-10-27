// Prompt field · Stars: the star field (intros/starfield.js) in a dark slit around the input,
// warping on send and flattening into the line.
window.SagePromptField = {
  create(W, H) {
    const field = SageStarfield.create(W, H);
    const lerp = (a, b, k) => a + (b - a) * k;
    return {
      draw(ctx, t, dt, o) {
        field.draw(ctx, t, dt, {
          cx: o.cx,
          cy: o.cy,
          speed: lerp(0.8, 7, o.warp) + 9 * o.rush,
          trail: 0.05 * o.warp,
          gap: o.gap,
          band: lerp(0.55, 1, o.move),
          squash: o.squash,
          half: o.half,
          alpha: o.alpha,
        });
      },
    };
  },
};
