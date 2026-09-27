import { Container, Graphics } from 'pixi.js';
import { project, PLAYER_T } from './Lanes.js';

export const BACKPACK_CAPACITY = 3;
export const ORDER_TIME = 22; // seconds before a carried order goes cold
const COLLECT_WINDOW = 0.08;
const MAX_STREAK = 5;

export const DISHES = {
  burger: { label: 'Burger', color: 0xe8a55a },
  frites: { label: 'Frites', color: 0xf5c542 },
  wrap: { label: 'Wrap', color: 0x9bd36a },
};
const DISH_KEYS = Object.keys(DISHES);

function drawOrderBox(g, dish) {
  const { color } = DISHES[dish];
  g.ellipse(0, 22, 30, 7).fill({ color: 0x000000, alpha: 0.3 });
  g.roundRect(-26, -14, 52, 34, 6).fill(0xf4e6cf);
  g.roundRect(-26, -14, 52, 8, 4).fill(0xe6d3b3);
  g.roundRect(-16, -6, 32, 18, 4).fill(color);
  g.circle(0, -20, 6).fill({ color: 0xffffff, alpha: 0.9 });
  g.circle(0, -20, 12).stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
}

function drawClient(g, dish) {
  const { color } = DISHES[dish];
  // delivery ring on the road
  g.ellipse(0, 6, 60, 18).stroke({ color: 0x4fd1ff, width: 4, alpha: 0.9 });
  g.ellipse(0, 6, 60, 18).fill({ color: 0x4fd1ff, alpha: 0.15 });
  // the customer, waiting on the kerb side
  g.roundRect(-14, -60, 28, 44, 10).fill(0x5a4a8a);
  g.circle(0, -72, 14).fill(0xd9a97a);
  g.roundRect(-16, -84, 32, 10, 5).fill(0x2a2a33);
  // speech bubble showing what they ordered
  g.roundRect(14, -118, 44, 30, 8).fill(0xffffff);
  g.poly([20, -88, 30, -88, 18, -80]).fill(0xffffff);
  g.roundRect(24, -110, 24, 14, 4).fill(color);
}

/**
 * The delivery loop: orders spawn on the road, the Bunisher stuffs them in
 * his backpack, and customers waiting on the route take the oldest matching
 * order. Carried orders go cold after ORDER_TIME seconds.
 */
export class OrderManager {
  constructor(spawner) {
    this.spawner = spawner;
    this.container = new Container();
    this.items = [];
    this.pool = [];
    this.backpack = [];
    this.deliveries = 0;
    this.streak = 0;
    this.spawnTimer = 0;
    this.time = 0;
    this.nextId = 1;
    this.reset();
  }

  reset() {
    for (const it of this.items) this.recycle(it);
    this.items.length = 0;
    this.backpack = [];
    this.deliveries = 0;
    this.streak = 0;
    this.spawnTimer = 1.8;
  }

  recycle(it) {
    it.gfx.visible = false;
    this.pool.push(it);
  }

  create(kind, dish, lane) {
    let it = this.pool.pop();
    if (!it) {
      it = { gfx: new Graphics(), kind, dish, lane, t: 0 };
      this.container.addChild(it.gfx);
    }
    it.kind = kind;
    it.dish = dish;
    it.lane = lane;
    it.t = 0;
    it.gfx.clear();
    if (kind === 'order') drawOrderBox(it.gfx, dish);
    else drawClient(it.gfx, dish);
    it.gfx.visible = true;
    return it;
  }

  spawn() {
    const blocked = this.spawner.blockedLanesNear(0, 0.3);
    const free = [0, 1, 2].filter((l) => !blocked.has(l));
    if (!free.length) return;
    const lane = free[Math.floor(Math.random() * free.length)];

    const carrying = this.backpack.length;
    const wantClient = carrying > 0 && (carrying >= BACKPACK_CAPACITY || Math.random() < 0.55);
    if (wantClient) {
      // a customer who wants something the Bunisher is actually carrying
      const dish = this.backpack[Math.floor(Math.random() * carrying)].dish;
      this.items.push(this.create('client', dish, lane));
    } else if (carrying < BACKPACK_CAPACITY) {
      const dish = DISH_KEYS[Math.floor(Math.random() * DISH_KEYS.length)];
      this.items.push(this.create('order', dish, lane));
    }
  }

  /**
   * @returns {{ pickedUp: object[], delivered: object[], cold: object[] }}
   *   delivered entries carry { points, tip, x, y }; pickups/cold carry { dish, x, y }.
   */
  update(dt, speed, playerLane) {
    this.time += dt;
    this.spawnTimer -= dt * (speed / 0.7);
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = 1.6 + Math.random() * 1.2;
    }

    const result = { pickedUp: [], delivered: [], cold: [] };

    // carried orders cool down
    for (let i = this.backpack.length - 1; i >= 0; i--) {
      const o = this.backpack[i];
      o.timeLeft -= dt;
      if (o.timeLeft <= 0) {
        this.backpack.splice(i, 1);
        this.streak = 0;
        result.cold.push({ dish: o.dish });
      }
    }

    const player = project(playerLane, PLAYER_T);
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt * speed;
      const onPlayer = it.lane === playerLane && Math.abs(it.t - PLAYER_T) < COLLECT_WINDOW;

      if (onPlayer && it.kind === 'order' && this.backpack.length < BACKPACK_CAPACITY) {
        this.backpack.push({ id: this.nextId++, dish: it.dish, timeLeft: ORDER_TIME });
        result.pickedUp.push({ dish: it.dish, x: player.x, y: player.y - 60 });
        this.items.splice(i, 1);
        this.recycle(it);
        continue;
      }
      if (onPlayer && it.kind === 'client') {
        const idx = this.backpack.findIndex((o) => o.dish === it.dish);
        if (idx !== -1) {
          const order = this.backpack.splice(idx, 1)[0];
          this.streak = Math.min(MAX_STREAK, this.streak + 1);
          this.deliveries += 1;
          const fresh = order.timeLeft / ORDER_TIME;
          result.delivered.push({
            points: 100 * this.streak + Math.round(50 * fresh),
            tip: 2 + this.streak + (fresh > 0.6 ? 2 : 0),
            streak: this.streak,
            x: player.x,
            y: player.y - 80,
          });
          this.items.splice(i, 1);
          this.recycle(it);
          continue;
        }
      }
      if (it.t > 1.3) {
        this.items.splice(i, 1);
        this.recycle(it);
        continue;
      }

      const p = project(it.lane, it.t);
      const bob = it.kind === 'order' ? Math.sin(this.time * 5 + it.t * 20) * 6 * p.scale : 0;
      it.gfx.position.set(p.x, p.y - 20 * p.scale + bob);
      it.gfx.scale.set(p.scale);
      it.gfx.zIndex = it.t;
    }
    this.container.sortChildren();
    return result;
  }

  /** Snapshot for the HUD. */
  hudState() {
    return {
      deliveries: this.deliveries,
      streak: this.streak,
      backpack: this.backpack.map((o) => ({ id: o.id, dish: o.dish, ratio: o.timeLeft / ORDER_TIME })),
    };
  }
}
