import { Container, Graphics } from 'pixi.js';
import { project, LANE_COUNT, PLAYER_T } from '../modes/rush/Lanes.js';

const LANE_TWEEN_SPEED = 12; // lanes per second while swiping
const BUNISHER_ORANGE = 0xff6a1a; // "orange braise" — reserved for the Bunisher only

/**
 * The Bunisher. Placeholder art: a burger-bun mask with the black headband,
 * drawn with Graphics until the Higgsfield sprite sheet is ready.
 */
export class Player {
  constructor() {
    this.container = new Container();
    this.lane = 1;
    this.visualLane = 1; // interpolated toward `lane`
    this.time = 0;
    this.shieldTime = 0;
    this.invulnTime = 0;

    this.body = new Graphics();
    this.shield = new Graphics();
    this.container.addChild(this.shield, this.body);
    this.drawBody();
    this.drawShield();
  }

  drawBody() {
    const g = this.body;
    g.clear();
    // apron / torso
    g.roundRect(-26, -10, 52, 54, 12).fill(0x2b2b2b);
    g.roundRect(-18, 2, 36, 40, 8).fill(BUNISHER_ORANGE);
    // arms
    g.roundRect(-38, -4, 12, 36, 6).fill(0x2b2b2b);
    g.roundRect(26, -4, 12, 36, 6).fill(0x2b2b2b);
    // bun head
    g.ellipse(0, -36, 34, 30).fill(0xe8a55a);
    g.ellipse(0, -46, 30, 16).fill(0xf2bd7a);
    // sesame seeds
    for (const [x, y] of [[-14, -52], [-2, -58], [10, -54], [18, -46], [-20, -44]]) {
      g.ellipse(x, y, 3, 2).fill(0xfff1d6);
    }
    // black headband over the eyes
    g.rect(-34, -40, 68, 12).fill(0x111111);
    g.rect(-30, -37, 8, 5).fill({ color: BUNISHER_ORANGE, alpha: 0.9 });
    g.rect(22, -37, 8, 5).fill({ color: BUNISHER_ORANGE, alpha: 0.9 });
    // legs
    g.roundRect(-18, 42, 14, 18, 5).fill(0x1c1c1c);
    g.roundRect(4, 42, 14, 18, 5).fill(0x1c1c1c);
  }

  drawShield() {
    this.shield.clear();
    this.shield.circle(0, -10, 62).stroke({ color: 0x4fd1ff, width: 4, alpha: 0.9 });
    this.shield.circle(0, -10, 62).fill({ color: 0x4fd1ff, alpha: 0.12 });
    this.shield.visible = false;
  }

  moveLeft() {
    this.lane = Math.max(0, this.lane - 1);
  }

  moveRight() {
    this.lane = Math.min(LANE_COUNT - 1, this.lane + 1);
  }

  activateShield(seconds) {
    this.shieldTime = seconds;
  }

  get hasShield() {
    return this.shieldTime > 0;
  }

  /** Consumes the shield (or i-frames) to absorb a hit. Returns true if the hit was absorbed. */
  absorbHit() {
    if (this.invulnTime > 0) return true;
    if (this.shieldTime > 0) {
      this.shieldTime = 0;
      this.invulnTime = 1;
      return true;
    }
    return false;
  }

  reset() {
    this.lane = 1;
    this.visualLane = 1;
    this.shieldTime = 0;
    this.invulnTime = 0;
  }

  update(dt) {
    this.time += dt;
    this.shieldTime = Math.max(0, this.shieldTime - dt);
    this.invulnTime = Math.max(0, this.invulnTime - dt);

    const diff = this.lane - this.visualLane;
    const step = LANE_TWEEN_SPEED * dt;
    this.visualLane = Math.abs(diff) <= step ? this.lane : this.visualLane + Math.sign(diff) * step;

    const p = project(this.visualLane, PLAYER_T);
    const bob = Math.sin(this.time * 14) * 4;
    this.container.position.set(p.x, p.y + bob);
    this.container.rotation = -diff * 0.25;
    this.shield.visible = this.shieldTime > 0;
    this.shield.alpha = this.shieldTime < 1 ? 0.4 + 0.6 * Math.abs(Math.sin(this.time * 20)) : 1;
    this.body.alpha = this.invulnTime > 0 ? 0.5 + 0.5 * Math.abs(Math.sin(this.time * 30)) : 1;
  }
}
