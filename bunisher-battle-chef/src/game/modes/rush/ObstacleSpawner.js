import { Container, Graphics } from 'pixi.js';
import { project, LANE_COUNT, PLAYER_T } from './Lanes.js';

// Kitchen hazards. Each has a placeholder drawing until real sprites land.
const OBSTACLE_TYPES = {
  plateau: {
    draw(g) {
      // hot tray with a shimmer of heat
      g.roundRect(-44, -14, 88, 28, 6).fill(0x8a8a8a);
      g.roundRect(-40, -10, 80, 20, 4).fill(0xd94b1a);
      g.roundRect(-36, -6, 72, 6, 3).fill({ color: 0xffb070, alpha: 0.7 });
    },
  },
  casserole: {
    draw(g) {
      g.ellipse(0, 8, 36, 12).fill(0x333333);
      g.roundRect(-34, -24, 68, 34, 8).fill(0x4a4a55);
      g.roundRect(-30, -28, 60, 8, 4).fill(0x6b6b78);
      g.roundRect(34, -18, 26, 8, 4).fill(0x2a2a2a);
      g.circle(0, -34, 8).fill({ color: 0xffffff, alpha: 0.35 });
    },
  },
  chariot: {
    draw(g) {
      g.roundRect(-40, -60, 80, 70, 6).fill(0xb9b9c4);
      g.rect(-36, -44, 72, 4).fill(0x8a8a96);
      g.rect(-36, -22, 72, 4).fill(0x8a8a96);
      g.circle(-28, 18, 8).fill(0x222222);
      g.circle(28, 18, 8).fill(0x222222);
    },
  },
};

const TYPE_KEYS = Object.keys(OBSTACLE_TYPES);
const HIT_WINDOW = 0.07; // depth tolerance for a collision at the player's t

/**
 * Spawns obstacles at the horizon and drives them toward the player.
 * Guarantees at least one free lane per spawn wave so runs are always survivable.
 */
export class ObstacleSpawner {
  constructor() {
    this.container = new Container();
    this.active = [];
    this.pool = [];
    this.spawnTimer = 0;
    this.reset();
  }

  reset() {
    for (const o of this.active) this.recycle(o);
    this.active.length = 0;
    this.spawnTimer = 1.2;
  }

  recycle(o) {
    o.gfx.visible = false;
    this.pool.push(o);
  }

  create(type, lane) {
    let o = this.pool.pop();
    if (!o) {
      o = { gfx: new Graphics(), type, lane, t: 0 };
      this.container.addChild(o.gfx);
    }
    o.type = type;
    o.lane = lane;
    o.t = 0;
    o.gfx.clear();
    OBSTACLE_TYPES[type].draw(o.gfx);
    o.gfx.visible = true;
    return o;
  }

  spawnWave(difficulty) {
    // 1 obstacle early on, up to 2 lanes blocked later — never all 3
    const count = Math.random() < Math.min(0.15 + difficulty * 0.5, 0.65) ? 2 : 1;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, Math.min(count, LANE_COUNT - 1));
    for (const lane of lanes) {
      const type = TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];
      this.active.push(this.create(type, lane));
    }
  }

  /**
   * @param dt seconds
   * @param speed depth units per second
   * @param difficulty 0..1 ramp used to tighten spawn intervals
   */
  update(dt, speed, difficulty) {
    this.spawnTimer -= dt * (speed / 0.7);
    if (this.spawnTimer <= 0) {
      this.spawnWave(difficulty);
      this.spawnTimer = 1.1 - difficulty * 0.45 + Math.random() * 0.4;
    }

    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.t += dt * speed;
      if (o.t > 1.3) {
        this.active.splice(i, 1);
        this.recycle(o);
        continue;
      }
      const p = project(o.lane, o.t);
      o.gfx.position.set(p.x, p.y);
      o.gfx.scale.set(p.scale);
    }
  }

  /** True if any obstacle occupies the player's lane at the player's depth. */
  checkCollision(playerLane) {
    return this.active.some(
      (o) => o.lane === playerLane && Math.abs(o.t - PLAYER_T) < HIT_WINDOW,
    );
  }

  /** Lanes currently blocked near a given depth — used by CoinManager to avoid overlap. */
  blockedLanesNear(t, window = 0.15) {
    const set = new Set();
    for (const o of this.active) if (Math.abs(o.t - t) < window) set.add(o.lane);
    return set;
  }
}
