// bgfx.js
// A lightweight full-screen canvas that sits behind all UI and renders a
// gentle themed decoration: falling snow/leaves/petals, drifting fish or
// coffee cups/hearts, or a simple animated beach scene. Everything here is
// drawn with canvas primitives + emoji glyphs, so there are no image assets
// to bundle or license.

const BackgroundFX = (() => {
  let canvas, ctx2d, width = 0, height = 0;
  let particles = [];
  let currentMode = null;
  let rafId = null;
  let lastTime = null;
  let initialized = false;

  // dir: "down" | "up" | "across"
  const THEME_CONFIG = {
    hiver:      { emojis: ["❄"],        count: 34, dir: "down",   speed: [22, 50], size: [12, 22], sway: 1.2, rotate: false, alpha: 0.7 },
    automne:    { emojis: ["🍁", "🍂"], count: 20, dir: "down",   speed: [26, 55], size: [16, 26], sway: 1.6, rotate: true,  alpha: 0.65 },
    printemps:  { emojis: ["🌸", "🌷"], count: 18, dir: "down",   speed: [14, 32], size: [15, 22], sway: 1.0, rotate: true,  alpha: 0.6 },
    ocean:      { emojis: ["🐟", "🐠"], count: 9,  dir: "across", speed: [22, 42], size: [18, 28], sway: 0,   rotate: false, alpha: 0.55, bubbles: true },
    fancy:      { emojis: ["☕"],       count: 10, dir: "up",     speed: [10, 20], size: [16, 24], sway: 0.8, rotate: false, alpha: 0.4 },
    romantique: { emojis: ["💕", "🌹"], count: 14, dir: "up",     speed: [12, 24], size: [14, 22], sway: 0.9, rotate: false, alpha: 0.5 },
    ete:        { emojis: ["🕊️"],      count: 3,  dir: "across", speed: [30, 50], size: [16, 22], sway: 0,   rotate: false, alpha: 0.5, beachScene: true }
  };

  function rand(min, max) { return min + Math.random() * (max - min); }

  function ensureCanvas() {
    if (initialized) return;
    canvas = document.createElement("canvas");
    canvas.id = "bg-fx-canvas";
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx2d = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    initialized = true;
  }

  function resize() {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function makeParticle(cfg) {
    const dir = cfg.dir;
    const size = rand(cfg.size[0], cfg.size[1]);
    const speed = rand(cfg.speed[0], cfg.speed[1]);
    const emoji = cfg.emojis[Math.floor(Math.random() * cfg.emojis.length)];
    let x, y, vx = 0, vy = 0;
    if (dir === "down") {
      x = rand(0, width);
      y = rand(-height, 0);
      vy = speed;
    } else if (dir === "up") {
      x = rand(0, width);
      y = rand(height, height * 2);
      vy = -speed;
    } else {
      x = Math.random() < 0.5 ? -size : width + size;
      y = rand(height * 0.1, height * 0.85);
      vx = x < 0 ? speed : -speed;
    }
    return {
      emoji, x, y, vx, vy, size,
      phase: rand(0, Math.PI * 2),
      rotation: rand(0, Math.PI * 2),
      rotSpeed: cfg.rotate ? rand(-1, 1) : 0,
      swayAmp: cfg.sway || 0
    };
  }

  function buildParticles(cfg) {
    const list = [];
    for (let i = 0; i < cfg.count; i++) list.push(makeParticle(cfg));
    return list;
  }

  function drawBeachScene(t) {
    // sky already shows through (canvas is transparent elsewhere); just add sun + water band
    const sunX = width * 0.82;
    const sunY = height * 0.14;
    const sunR = Math.min(width, height) * 0.07;
    const grad = ctx2d.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.2);
    grad.addColorStop(0, "rgba(255,220,140,0.55)");
    grad.addColorStop(1, "rgba(255,220,140,0)");
    ctx2d.fillStyle = grad;
    ctx2d.beginPath();
    ctx2d.arc(sunX, sunY, sunR * 2.2, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = "rgba(255,236,179,0.85)";
    ctx2d.beginPath();
    ctx2d.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx2d.fill();

    // water band with animated wave edge
    const waterTop = height * 0.86;
    ctx2d.beginPath();
    ctx2d.moveTo(0, height);
    ctx2d.lineTo(0, waterTop);
    const step = 24;
    for (let x = 0; x <= width; x += step) {
      const y = waterTop + Math.sin((x + t * 0.05) * 0.02) * 6;
      ctx2d.lineTo(x, y);
    }
    ctx2d.lineTo(width, height);
    ctx2d.closePath();
    ctx2d.fillStyle = "rgba(64,180,196,0.28)";
    ctx2d.fill();

    // sand strip
    ctx2d.fillStyle = "rgba(244,217,160,0.22)";
    ctx2d.fillRect(0, height * 0.94, width, height * 0.06);
  }

  function updateAndDraw(cfg, dt, t) {
    particles.forEach(p => {
      if (cfg.dir === "down" || cfg.dir === "up") {
        p.y += p.vy * dt;
        const sway = Math.sin(t / 1000 + p.phase) * p.swayAmp * 12 * dt;
        p.x += sway;
      } else {
        p.x += p.vx * dt;
        p.y += Math.sin(t / 900 + p.phase) * 6 * dt;
      }
      p.rotation += p.rotSpeed * dt;

      if (cfg.dir === "down" && p.y > height + p.size) {
        Object.assign(p, makeParticle({ ...cfg, dir: "down" }), { y: -p.size, x: rand(0, width) });
      } else if (cfg.dir === "up" && p.y < -p.size) {
        Object.assign(p, makeParticle({ ...cfg, dir: "up" }), { y: height + p.size, x: rand(0, width) });
      } else if (cfg.dir === "across") {
        if (p.vx > 0 && p.x > width + p.size) Object.assign(p, makeParticle({ ...cfg, dir: "across" }));
        if (p.vx < 0 && p.x < -p.size) Object.assign(p, makeParticle({ ...cfg, dir: "across" }));
      }

      ctx2d.save();
      ctx2d.globalAlpha = cfg.alpha;
      ctx2d.translate(p.x, p.y);
      ctx2d.rotate(p.rotation);
      ctx2d.font = `${p.size}px sans-serif`;
      ctx2d.textAlign = "center";
      ctx2d.textBaseline = "middle";
      ctx2d.fillText(p.emoji, 0, 0);
      ctx2d.restore();
    });
  }

  function tick(t) {
    if (lastTime === null) lastTime = t;
    const dt = Math.min(0.05, (t - lastTime) / 1000);
    lastTime = t;
    ctx2d.clearRect(0, 0, width, height);

    if (currentMode) {
      const cfg = THEME_CONFIG[currentMode];
      if (cfg.beachScene) drawBeachScene(t);
      updateAndDraw(cfg, dt, t);
    }
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    lastTime = null;
    if (ctx2d) ctx2d.clearRect(0, 0, width, height);
  }

  function startLoop() {
    if (rafId) return;
    lastTime = null;
    rafId = requestAnimationFrame(tick);
  }

  function init() {
    ensureCanvas();
  }

  function setTheme(themeId) {
    ensureCanvas();
    const cfg = THEME_CONFIG[themeId];
    if (!cfg) {
      currentMode = null;
      stopLoop();
      return;
    }
    currentMode = themeId;
    particles = buildParticles(cfg);
    startLoop();
  }

  return { init, setTheme };
})();
