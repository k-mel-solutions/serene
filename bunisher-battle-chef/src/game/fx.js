import { Container, Graphics, Text } from 'pixi.js';

/**
 * Lightweight juice: burst particles, floating score text and screen shake.
 * One instance per scene; call update(dt) every frame.
 */
export class FX {
  constructor() {
    this.container = new Container();
    this.particles = [];
    this.texts = [];
    this.shakeTime = 0;
    this.shakeStrength = 0;
  }

  burst(x, y, color, count = 10, speed = 180) {
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      g.circle(0, 0, 3 + Math.random() * 4).fill(color);
      g.position.set(x, y);
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.container.addChild(g);
      this.particles.push({ g, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.6 });
    }
  }

  text(x, y, str, { color = 0xffffff, size = 26 } = {}) {
    const t = new Text({
      text: str,
      style: {
        fontFamily: 'Bangers, Inter, sans-serif',
        fontSize: size,
        fill: color,
        stroke: { color: 0x000000, width: 5 },
        letterSpacing: 2,
      },
    });
    t.anchor.set(0.5);
    t.position.set(x, y);
    this.container.addChild(t);
    this.texts.push({ t, life: 0.9 });
  }

  shake(strength = 8, time = 0.25) {
    this.shakeStrength = strength;
    this.shakeTime = time;
  }

  /** Returns the current shake offset so the scene can apply it to its root. */
  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy += 500 * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = Math.max(0, p.life / 0.6);
      if (p.life <= 0) {
        this.container.removeChild(p.g);
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const e = this.texts[i];
      e.life -= dt;
      e.t.y -= 60 * dt;
      e.t.alpha = Math.min(1, e.life / 0.4);
      if (e.life <= 0) {
        this.container.removeChild(e.t);
        e.t.destroy();
        this.texts.splice(i, 1);
      }
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const s = this.shakeStrength * (this.shakeTime / 0.25);
      return { x: (Math.random() - 0.5) * s * 2, y: (Math.random() - 0.5) * s * 2 };
    }
    return { x: 0, y: 0 };
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
