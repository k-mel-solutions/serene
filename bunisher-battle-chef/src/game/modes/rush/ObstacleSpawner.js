import { Container, Graphics } from 'pixi.js';
import { project, LANE_COUNT, PLAYER_T } from './Lanes.js';

// Street hazards on the delivery route. Placeholder drawings until real sprites land.
const OBSTACLE_TYPES = {
  plateau: {
    draw(g) {
      // hot tray dropped on the road, with heat shimmer
      g.ellipse(0, 10, 50, 10).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(-46, -12, 92, 26, 6).fill(0x9a9aa4);
      g.roundRect(-42, -8, 84, 18, 4).fill(0xd94b1a);
      g.roundRect(-38, -5, 76, 5, 2).fill({ color: 0xffb070, alpha: 0.8 });
      for (const x of [-24, 0, 24]) {
        g.moveTo(x, -18).quadraticCurveTo(x + 6, -28, x, -38).stroke({ color: 0xffffff, alpha: 0.35, width: 3 });
      }
    },
  },
  casserole: {
    draw(g) {
      g.ellipse(0, 12, 42, 10).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(-36, -26, 72, 36, 8).fill(0x4a4a55);
      g.roundRect(-36, -26, 72, 10, 6).fill(0x6b6b78);
      g.roundRect(34, -20, 30, 8, 4).fill(0x2a2a2e);
      g.roundRect(-64, -20, 30, 8, 4).fill(0x2a2a2e);
      g.circle(-6, -38, 7).fill({ color: 0xffffff, alpha: 0.3 });
      g.circle(8, -50, 5).fill({ color: 0xffffff, alpha: 0.2 });
    },
  },
  chariot: {
    draw(g) {
      g.ellipse(0, 24, 50, 10).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(-42, -66, 84, 78, 6).fill(0xb9b9c4);
      g.roundRect(-42, -66, 84, 10, 6).fill(0xdcdce4);
      g.rect(-38, -46, 76, 3).fill(0x8a8a96);
      g.rect(-38, -22, 76, 3).fill(0x8a8a96);
      g.roundRect(-30, -42, 24, 14, 3).fill(0xd94b1a);
      g.roundRect(4, -42, 24, 14, 3).fill(0xf5c542);
      g.circle(-30, 20, 9).fill(0x222222);
      g.circle(30, 20, 9).fill(0x222222);
      g.circle(-30, 20, 3).fill(0x888888);
      g.circle(30, 20, 3).fill(0x888888);
    },
  },
  caisses: {
    draw(g) {
      g.ellipse(0, 18, 46, 10).fill({ color: 0x000000, alpha: 0.3 });
      g.roundRect(-40, -18, 80, 34, 4).fill(0x8a5a2b);
      g.roundRect(-30, -50, 60, 32, 4).fill(0xa06a34);
      g.rect(-40, -2, 80, 3).fill({ color: 0x000000, alpha: 0.25 });
      g.rect(-30, -34, 60, 3).fill({ color: 0x000000, alpha: 0.25 });
      g.rect(-22, -44, 44, 8).fill({ color: 0xfff1d6, alpha: 0.6 });
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
    this.spawnTimer = 1.4;
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
      o.gfx.zIndex = o.t;
    }
    this.container.sortChildren();
  }

  /** True if any obstacle occupies the player's lane at the player's depth. */
  checkCollision(playerLane) {
    return this.active.some(
      (o) => o.lane === playerLane && Math.abs(o.t - PLAYER_T) < HIT_WINDOW,
    );
  }

  /** Lanes currently blocked near a given depth — used by pickups to avoid overlap. */
  blockedLanesNear(t, window = 0.15) {
    const set = new Set();
    for (const o of this.active) if (Math.abs(o.t - t) < window) set.add(o.lane);
    return set;
  }
}
