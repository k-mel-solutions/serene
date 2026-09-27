import { Container, Graphics } from 'pixi.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../engine.js';

export const LANE_COUNT = 3;
export const LANE_SPACING = 130; // px between lane centers at the player's depth
export const HORIZON_Y = 300;
export const PLAYER_Y = 660;
export const PLAYER_T = 1; // depth value at which objects meet the player
export const CENTER_X = DESIGN_WIDTH / 2;
const FAR_SPREAD = 0.06;

/**
 * Pseudo-3D depth projection. t = 0 at the horizon, 1 at the player,
 * slightly past 1 before objects leave the screen.
 */
export function project(lane, t) {
  const eased = t * t; // objects accelerate toward the camera
  const spread = FAR_SPREAD + (1 - FAR_SPREAD) * eased;
  return {
    x: CENTER_X + (lane - 1) * LANE_SPACING * spread,
    y: HORIZON_Y + (PLAYER_Y - HORIZON_Y) * eased,
    scale: 0.08 + 0.92 * eased,
  };
}

// Night-strip district: neon city at dusk. Other districts swap this palette.
const SKY_TOP = 0x120a1f;
const SKY_BOTTOM = 0x4a1f3a;
const GLOW = 0xff6a1a;

/**
 * The delivery street: sky, parallax skyline, sidewalks, road with dashed
 * lines, and lampposts that fly past to sell speed.
 */
export class Lanes {
  constructor() {
    this.container = new Container();
    this.scroll = 0;
    this.lampScroll = 0;

    this.sky = new Graphics();
    this.skyline = new Graphics();
    this.road = new Graphics();
    this.stripes = new Graphics();
    this.lamps = new Graphics();
    this.container.addChild(this.sky, this.skyline, this.road, this.stripes, this.lamps);
    this.drawSky();
    this.drawSkyline();
    this.drawRoad();
  }

  drawSky() {
    const g = this.sky;
    const bands = 24;
    for (let i = 0; i < bands; i++) {
      const f = i / (bands - 1);
      const color = lerpColor(SKY_TOP, SKY_BOTTOM, f);
      g.rect(0, (HORIZON_Y * i) / bands, DESIGN_WIDTH, HORIZON_Y / bands + 1).fill(color);
    }
    // sunset glow behind the skyline
    g.ellipse(CENTER_X, HORIZON_Y + 10, 260, 70).fill({ color: GLOW, alpha: 0.25 });
    // stars
    let seed = 7;
    for (let i = 0; i < 40; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      const x = (seed / 233280) * DESIGN_WIDTH;
      seed = (seed * 9301 + 49297) % 233280;
      const y = (seed / 233280) * HORIZON_Y * 0.6;
      g.circle(x, y, 1 + (i % 3) * 0.4).fill({ color: 0xffffff, alpha: 0.5 });
    }
  }

  drawSkyline() {
    const g = this.skyline;
    let seed = 42;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    // far layer
    for (let x = -20; x < DESIGN_WIDTH + 20; ) {
      const w = 24 + rnd() * 40;
      const h = 40 + rnd() * 90;
      g.rect(x, HORIZON_Y - h, w, h).fill(0x1c1030);
      x += w + 2;
    }
    // near layer with lit windows
    seed = 99;
    for (let x = -10; x < DESIGN_WIDTH + 10; ) {
      const w = 30 + rnd() * 50;
      const h = 25 + rnd() * 60;
      g.rect(x, HORIZON_Y - h, w, h).fill(0x0e0818);
      for (let wy = HORIZON_Y - h + 6; wy < HORIZON_Y - 8; wy += 10) {
        for (let wx = x + 5; wx < x + w - 6; wx += 9) {
          if (rnd() < 0.45) g.rect(wx, wy, 4, 5).fill({ color: rnd() < 0.2 ? GLOW : 0xffd27a, alpha: 0.85 });
        }
      }
      x += w + 3;
    }
    // neon signs
    g.roundRect(60, HORIZON_Y - 120, 70, 16, 4).fill({ color: 0xff2d7a, alpha: 0.9 });
    g.roundRect(340, HORIZON_Y - 95, 50, 14, 4).fill({ color: 0x2de0ff, alpha: 0.9 });
  }

  drawRoad() {
    const g = this.road;
    const near = project(0, 1.3);
    const half = (spreadT) => LANE_SPACING * 1.5 * (FAR_SPREAD + (1 - FAR_SPREAD) * spreadT * spreadT);
    const halfFar = half(0);
    const halfNear = half(1.3);

    // ground beyond the sidewalks
    g.rect(0, HORIZON_Y, DESIGN_WIDTH, DESIGN_HEIGHT - HORIZON_Y).fill(0x1a1022);
    // sidewalks
    const sw = 1.6;
    g.poly([
      CENTER_X - halfFar * sw, HORIZON_Y,
      CENTER_X + halfFar * sw, HORIZON_Y,
      CENTER_X + halfNear * sw, near.y,
      CENTER_X - halfNear * sw, near.y,
    ]).fill(0x3a2f45);
    // asphalt
    g.poly([
      CENTER_X - halfFar, HORIZON_Y,
      CENTER_X + halfFar, HORIZON_Y,
      CENTER_X + halfNear, near.y,
      CENTER_X - halfNear, near.y,
    ]).fill(0x24202c);
    // kerbs
    for (const s of [-1, 1]) {
      g.poly([
        CENTER_X + s * halfFar, HORIZON_Y,
        CENTER_X + s * halfFar * 1.08, HORIZON_Y,
        CENTER_X + s * halfNear * 1.06, near.y,
        CENTER_X + s * halfNear, near.y,
      ]).fill(0xd8b36a);
    }
    // horizon haze so the road fades into the city
    g.rect(0, HORIZON_Y, DESIGN_WIDTH, 36).fill({ color: SKY_BOTTOM, alpha: 0.5 });
  }

  update(dt, speed) {
    this.scroll = (this.scroll + dt * speed * 0.6) % 1;
    this.lampScroll = (this.lampScroll + dt * speed * 0.25) % 1;

    // dashed lane separators marching toward the camera
    const g = this.stripes;
    g.clear();
    const DASHES = 14;
    for (let i = 0; i < DASHES; i++) {
      const t0 = ((i + this.scroll) / DASHES) * 1.3;
      const t1 = t0 + 0.035;
      for (const edge of [0.5, 1.5]) {
        const a = project(edge, t0);
        const b = project(edge, t1);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xf0e6c8, alpha: 0.35 + 0.4 * t0, width: 2 + 3 * t0 });
      }
    }

    // lampposts on both sidewalks
    const l = this.lamps;
    l.clear();
    const LAMPS = 4;
    for (let i = 0; i < LAMPS; i++) {
      const t = ((i + this.lampScroll) / LAMPS) * 1.3;
      if (t < 0.05) continue;
      for (const side of [-1, 1]) {
        const p = project(1 + side * 1.75, t);
        const h = 150 * p.scale;
        l.rect(p.x - 3 * p.scale, p.y - h, 6 * p.scale, h).fill(0x2a2a33);
        l.circle(p.x, p.y - h, 9 * p.scale).fill(0xffe8a0);
        l.circle(p.x, p.y - h, 26 * p.scale).fill({ color: 0xffd27a, alpha: 0.15 });
      }
    }
  }
}

function lerpColor(a, b, f) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * f);
  const gg = Math.round(ag + (bg - ag) * f);
  const bl = Math.round(ab + (bb - ab) * f);
  return (r << 16) | (gg << 8) | bl;
}
