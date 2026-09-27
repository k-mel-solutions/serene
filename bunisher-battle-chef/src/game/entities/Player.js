import { Container, Graphics } from 'pixi.js';
import { project, LANE_COUNT, PLAYER_T } from '../modes/rush/Lanes.js';
import { drawBunisher } from './bunisherArt.js';

const LANE_TWEEN_SPEED = 12; // lanes per second while swiping

/**
 * The Bunisher on delivery duty: runs the lanes with his insulated backpack.
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
    drawBunisher(this.body, { backpack: true, pose: 'run' });
    this.drawShield();
  }

  drawShield() {
    this.shield.clear();
    this.shield.circle(0, -10, 66).stroke({ color: 0x4fd1ff, width: 4, alpha: 0.9 });
    this.shield.circle(0, -10, 66).fill({ color: 0x4fd1ff, alpha: 0.12 });
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
    const bob = Math.abs(Math.sin(this.time * 12)) * -6;
    this.container.position.set(p.x, p.y + bob);
    this.container.rotation = -diff * 0.25;
    this.body.scale.set(1, 1 + Math.sin(this.time * 24) * 0.02);
    this.shield.visible = this.shieldTime > 0;
    this.shield.alpha = this.shieldTime < 1 ? 0.4 + 0.6 * Math.abs(Math.sin(this.time * 20)) : 1;
    this.body.alpha = this.invulnTime > 0 ? 0.5 + 0.5 * Math.abs(Math.sin(this.time * 30)) : 1;
  }
}
