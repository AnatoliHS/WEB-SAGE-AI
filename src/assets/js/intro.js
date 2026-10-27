// Cosmic Star Swirl Intro & Seamless Hero Transition
// 1. Diagonal empty slit top-left to bottom-right with tight S stardust stream
// 2. Cosmic sheet rotates smoothly to horizontal, unrolling into stars top & bottom
// 3. SAGE.IS emerges glowing in the dark central gap while stars fade out
// 4. Seamless FLIP glide into the Hero section wordmark anchor
// 5. Hero wordmark docks, hero rule & content fade in naturally
(() => {
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro || !root.classList.contains('has-intro')) return;

  const canvas = document.getElementById('intro-star-canvas');
  const clone = document.getElementById('intro-brand-clone');
  const anchor = document.getElementById('hero-wordmark-anchor');
  if (!canvas || !clone) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = 1;
  let animId = null;
  let done = false;
  let hasGlided = false;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Particle System Architecture
  // 3,800 Sheet particles + 60 Foreground Floating points
  const SHEET_COUNT = 3800;
  const FOREGROUND_COUNT = 60;
  const sheetParticles = [];
  const fgParticles = [];

  class SheetParticle {
    constructor(isUpper) {
      this.isUpper = isUpper;
      this.reset();
    }

    reset() {
      this.u = (Math.random() - 0.5) * 2;
      this.distRatio = Math.pow(Math.random(), 3.0);
      this.z = 90 + Math.random() * 860;
      this.speed = 0.35 + Math.random() * 0.75;
      this.baseSize = 0.45 + Math.random() * 0.9;
      this.brightness = 0.35 + Math.random() * 0.65;
      this.twinkleOffset = Math.random() * Math.PI * 2;
    }

    update() {
      this.z -= this.speed;
      if (this.z < 80) this.z = 950;
    }
  }

  class FGParticle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = (Math.random() - 0.5) * width * 1.5;
      this.y = (Math.random() - 0.5) * height * 1.5;
      this.z = 70 + Math.random() * 380;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.size = 1.4 + Math.random() * 1.8;
      this.brightness = 0.75 + Math.random() * 0.25;
      this.twinkleOffset = Math.random() * Math.PI * 2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  for (let i = 0; i < SHEET_COUNT; i++) {
    sheetParticles.push(new SheetParticle(i % 2 === 0));
  }
  for (let i = 0; i < FOREGROUND_COUNT; i++) {
    fgParticles.push(new FGParticle());
  }

  function getStartRotation() {
    return Math.min(0.52, Math.max(0.28, Math.atan2(height * 0.48, width * 0.78)));
  }

  let currentRot = getStartRotation();
  let sAmp = 1.0;
  let starAlpha = 1.0;
  let isWordmarkRevealed = false;

  // Timeline durations (ms)
  const T_DIAGONAL_END = 1500;  // 0.0s - 1.5s: Diagonal top-left to bottom-right
  const T_ROTATE_END = 2900;    // 1.5s - 2.9s: Smooth rotation to horizontal stars top & bottom
  const T_REVEAL_END = 4000;    // 2.9s - 4.0s: SAGE.IS emerges in slit & stars fade
  const T_GLIDE_END = 5050;     // 4.0s - 5.05s: Seamless glide into hero anchor

  let startTime = null;

  const finish = () => {
    if (done) return;
    done = true;
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);

    intro.classList.add('is-out');
    root.classList.add('intro-completed');
    document.dispatchEvent(new Event('tinker:intro-done'));

    setTimeout(() => {
      root.classList.remove('has-intro');
      try { intro.remove(); } catch (e) {}
    }, 650);
  };

  const triggerHandover = () => {
    if (hasGlided || done) return;
    hasGlided = true;

    if (!anchor) {
      setTimeout(finish, 400);
      return;
    }

    // Precise FLIP measurement from clone position to hero anchor
    const ghost = anchor.querySelector('.hero-wordmark-ghost') || anchor;
    const ghostRect = ghost.getBoundingClientRect();
    const cloneRect = clone.getBoundingClientRect();

    const deltaX = ghostRect.left - cloneRect.left;
    const deltaY = ghostRect.top - cloneRect.top;

    clone.classList.add('is-gliding');
    clone.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;
  };

  const fov = 540;
  const cameraZ = 680;

  function render(now) {
    if (done) return;
    animId = requestAnimationFrame(render);

    if (!startTime) startTime = now;
    const elapsed = now - startTime;
    const startRot = getStartRotation();

    // Timeline Progression
    if (elapsed < T_DIAGONAL_END) {
      currentRot = startRot;
      sAmp = 1.0;
      starAlpha = 1.0;
      isWordmarkRevealed = false;
    } else if (elapsed < T_ROTATE_END) {
      const p = (elapsed - T_DIAGONAL_END) / (T_ROTATE_END - T_DIAGONAL_END);
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      currentRot = startRot * (1 - ease);
      sAmp = 1.0 * (1 - ease);
      starAlpha = 1.0;
      isWordmarkRevealed = false;
    } else if (elapsed < T_REVEAL_END) {
      currentRot = 0.0;
      sAmp = 0.0;
      const p = (elapsed - T_ROTATE_END) / (T_REVEAL_END - T_ROTATE_END);
      starAlpha = Math.max(0, 1.0 - p * 1.15);
      if (!isWordmarkRevealed) {
        isWordmarkRevealed = true;
        clone.classList.add('is-visible');
      }
    } else if (elapsed < T_GLIDE_END) {
      currentRot = 0.0;
      sAmp = 0.0;
      starAlpha = 0;
      if (!hasGlided) {
        triggerHandover();
      }
    } else {
      finish();
    }

    // Canvas Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    // Ambient radial glow when SAGE.IS reveals
    if (isWordmarkRevealed) {
      const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, width * 0.45);
      glow.addColorStop(0, 'rgba(48, 42, 255, 0.14)');
      glow.addColorStop(0.5, 'rgba(151, 26, 255, 0.06)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }

    // Render Cosmic Stars
    if (starAlpha > 0.01) {
      const horizontalWidth = Math.min(width * 0.88, 1280);
      const verticalSpread = Math.min(height * 0.52, 420);
      const slitHalfHeight = 16;

      const cosR = Math.cos(currentRot);
      const sinR = Math.sin(currentRot);
      const sSigmoidAmp = height * 0.18 * sAmp;

      const projected = [];

      for (let i = 0; i < sheetParticles.length; i++) {
        const p = sheetParticles[i];
        p.update();

        const uDist = p.u * horizontalWidth;
        const normU = uDist / (horizontalWidth * 0.4);
        const sigmoid = normU / Math.sqrt(1 + normU * normU);
        const yCenter = sigmoid * sSigmoidAmp;

        const yDist = slitHalfHeight + p.distRatio * verticalSpread;
        const yLocal = p.isUpper ? (yCenter - yDist) : (yCenter + yDist);

        const xRot = uDist * cosR - yLocal * sinR;
        const yRot = uDist * sinR + yLocal * cosR;

        const zFinal = p.z + cameraZ * 0.35;
        if (zFinal > 50) {
          const scale = fov / zFinal;
          const screenX = cx + xRot * scale;
          const screenY = cy + yRot * scale;

          if (screenX >= -10 && screenX <= width + 10 && screenY >= -10 && screenY <= height + 10) {
            const depthAlpha = Math.min(1, Math.max(0.14, (scale * 1.35) * p.brightness));
            const twinkle = 0.85 + 0.15 * Math.sin(now * 0.003 + p.twinkleOffset);
            const size = Math.min(2.1, Math.max(0.4, p.baseSize * scale * 0.85));

            projected.push({
              x: screenX,
              y: screenY,
              z: zFinal,
              size: size,
              alpha: depthAlpha * twinkle * starAlpha
            });
          }
        }
      }

      for (let i = 0; i < fgParticles.length; i++) {
        const fp = fgParticles[i];
        fp.update();

        const fx = fp.x * Math.cos(currentRot * 0.3) - fp.y * Math.sin(currentRot * 0.3);
        const fy = fp.x * Math.sin(currentRot * 0.3) + fp.y * Math.cos(currentRot * 0.3);

        const scale = fov / (fp.z + cameraZ * 0.35);
        const screenX = cx + fx * scale;
        const screenY = cy + fy * scale;

        if (screenX >= -10 && screenX <= width + 10 && screenY >= -10 && screenY <= height + 10) {
          projected.push({
            x: screenX,
            y: screenY,
            z: fp.z,
            size: Math.min(3.0, Math.max(1.4, fp.size * scale * 0.88)),
            alpha: fp.brightness * starAlpha
          });
        }
      }

      projected.sort((a, b) => b.z - a.z);

      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        if (pt.alpha <= 0.02) continue;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha.toFixed(2)})`;
        ctx.fill();
      }
    }
  }

  // Start rendering immediately
  animId = requestAnimationFrame(render);

  // Quick skip on click
  intro.addEventListener('click', finish);

  // Safety fallback
  setTimeout(finish, 6500);
})();
