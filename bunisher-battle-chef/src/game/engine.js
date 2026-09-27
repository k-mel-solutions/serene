import { Application } from 'pixi.js';

// Logical portrait resolution every scene is designed against.
// The canvas is letterboxed/scaled to whatever container it's mounted in.
export const DESIGN_WIDTH = 480;
export const DESIGN_HEIGHT = 800;

/**
 * Thin wrapper around a Pixi Application: owns the canvas, the ticker and the
 * current scene. Scenes implement { container, update(dt), destroy() }.
 */
export async function createEngine(mountEl) {
  const app = new Application();
  await app.init({
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    background: 0x1a0f0a,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  mountEl.appendChild(app.canvas);
  app.canvas.style.display = 'block';
  app.canvas.style.touchAction = 'none';

  let scene = null;

  function fit() {
    const { clientWidth: w, clientHeight: h } = mountEl;
    if (!w || !h) return;
    const scale = Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT);
    app.canvas.style.width = `${Math.floor(DESIGN_WIDTH * scale)}px`;
    app.canvas.style.height = `${Math.floor(DESIGN_HEIGHT * scale)}px`;
  }
  const ro = new ResizeObserver(fit);
  ro.observe(mountEl);
  fit();

  app.ticker.add((ticker) => {
    // deltaMS clamped so a background tab doesn't teleport everything on resume
    const dt = Math.min(ticker.deltaMS, 50) / 1000;
    scene?.update(dt);
  });

  return {
    app,
    setScene(next) {
      if (scene) {
        app.stage.removeChild(scene.container);
        scene.destroy();
      }
      scene = next;
      if (scene) app.stage.addChild(scene.container);
    },
    destroy() {
      ro.disconnect();
      this.setScene(null);
      app.destroy(true, { children: true });
    },
  };
}
