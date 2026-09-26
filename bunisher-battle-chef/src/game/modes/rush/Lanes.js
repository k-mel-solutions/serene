import { Container, Graphics } from 'pixi.js';
import { DESIGN_WIDTH } from '../../engine.js';

export const LANE_COUNT = 3;
export const LANE_SPACING = 130; // px between lane centers at the player's depth
export const HORIZON_Y = 150;
export const PLAYER_Y = 660;
export const PLAYER_T = 1; // depth value at which objects meet the player
export const CENTER_X = DESIGN_WIDTH / 2;

/**
 * Pseudo-3D depth projection. t = 0 at the horizon, 1 at the player,
 * slightly past 1 before objects leave the screen.
 */
export function project(lane, t) {
  const eased = t * t; // objects accelerate toward the camera
  const spread = 0.12 + 0.88 * eased;
  return {
    x: CENTER_X + (lane - 1) * LANE_SPACING * spread,
    y: HORIZON_Y + (PLAYER_Y - HORIZON_Y) * eased,
    scale: 0.15 + 0.85 * eased,
  };
}

/**
 * Draws the kitchen floor: three lanes converging on a vanishing point with
 * scrolling tile stripes to sell forward motion.
 */
export class Lanes {
  constructor() {
    this.container = new Container();
    this.scroll = 0;

    this.floor = new Graphics();
    this.stripes = new Graphics();
    this.container.addChild(this.floor, this.stripes);
    this.drawFloor();
  }

  drawFloor() {
    const g = this.floor;
    const far = project(0, 0);
    const near = project(0, 1.25);
    const halfFar = LANE_SPACING * 1.5 * 0.12;
    const halfNear = LANE_SPACING * 1.5 * (0.12 + 0.88 * 1.25 * 1.25);

    // back wall + hot glow at the horizon
    g.rect(0, 0, DESIGN_WIDTH, HORIZON_Y).fill(0x2a1810);
    g.rect(0, HORIZON_Y - 40, DESIGN_WIDTH, 40).fill({ color: 0xff6a1a, alpha: 0.18 });

    // floor slab
    g.poly([
      CENTER_X - halfFar, far.y,
      CENTER_X + halfFar, far.y,
      CENTER_X + halfNear, near.y,
      CENTER_X - halfNear, near.y,
    ]).fill(0x3b2418);

    // lane dividers
    for (const edge of [-0.5, 0.5]) {
      const a = project(1 + edge, 0);
      const b = project(1 + edge, 1.25);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xffb070, alpha: 0.35, width: 3 });
    }
    for (const edge of [-1.5, 1.5]) {
      const a = project(1 + edge, 0);
      const b = project(1 + edge, 1.25);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xffb070, alpha: 0.7, width: 4 });
    }
  }

  update(dt, speed) {
    this.scroll = (this.scroll + dt * speed * 0.5) % 1;
    const g = this.stripes;
    g.clear();
    const STRIPES = 8;
    for (let i = 0; i < STRIPES; i++) {
      const t = ((i + this.scroll) / STRIPES) * 1.25;
      const l = project(-0.5, t);
      const r = project(2.5, t);
      const alpha = 0.06 + 0.1 * t;
      g.moveTo(l.x, l.y).lineTo(r.x, r.y).stroke({ color: 0xffd0a0, alpha, width: 2 + t * 2 });
    }
  }
}
