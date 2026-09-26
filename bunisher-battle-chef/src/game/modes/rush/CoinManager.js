import { Container, Graphics } from 'pixi.js';
import { project, PLAYER_T } from './Lanes.js';

const COLLECT_WINDOW = 0.08;
const MAGNET_RANGE = 0.25; // depth range the magnet pulls from, across all lanes

// Ingredient bonuses that trigger power-ups when collected.
export const POWERUPS = {
  tablier: { label: 'Bouclier tablier', duration: 8, color: 0x4fd1ff },
  aimant: { label: 'Aimant à ingrédients', duration: 7, color: 0xd14fff },
  fouet: { label: 'Coup de fouet', duration: 5, color: 0xffd14f },
};

function drawCoin(g) {
  g.circle(0, 0, 16).fill(0xf5c542);
  g.circle(0, 0, 11).stroke({ color: 0xc8951a, width: 3 });
  g.rect(-3, -7, 6, 14).fill(0xc8951a);
}

function drawIngredient(g, kind) {
  const { color } = POWERUPS[kind];
  g.star(0, 0, 6, 22, 12).fill(color);
  g.circle(0, 0, 9).fill(0xffffff);
}

/**
 * Coins spawn in short lines down one lane; ingredients are rarer singles.
 * Both use the same depth/lane model as obstacles so collection is lane-based.
 */
export class CoinManager {
  constructor(spawner) {
    this.spawner = spawner;
    this.container = new Container();
    this.items = [];
    this.pool = [];
    this.spawnTimer = 0;
    this.time = 0;
    this.reset();
  }

  reset() {
    for (const it of this.items) this.recycle(it);
    this.items.length = 0;
    this.spawnTimer = 0.6;
  }

  recycle(it) {
    it.gfx.visible = false;
    this.pool.push(it);
  }

  create(kind, lane, t) {
    let it = this.pool.pop();
    if (!it) {
      it = { gfx: new Graphics(), kind, lane, t, x: 0, y: 0 };
      this.container.addChild(it.gfx);
    }
    it.kind = kind;
    it.lane = lane;
    it.t = t;
    it.gfx.clear();
    if (kind === 'coin') drawCoin(it.gfx);
    else drawIngredient(it.gfx, kind);
    it.gfx.visible = true;
    return it;
  }

  spawn() {
    const blocked = this.spawner.blockedLanesNear(0, 0.3);
    const free = [0, 1, 2].filter((l) => !blocked.has(l));
    if (!free.length) return;
    const lane = free[Math.floor(Math.random() * free.length)];

    if (Math.random() < 0.12) {
      const kinds = Object.keys(POWERUPS);
      this.items.push(this.create(kinds[Math.floor(Math.random() * kinds.length)], lane, 0));
      return;
    }
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      this.items.push(this.create('coin', lane, -i * 0.06));
    }
  }

  /**
   * Advances items and returns what the player collected this frame.
   * @returns {{coins: number, powerups: string[]}}
   */
  update(dt, speed, playerLane, magnetActive) {
    this.time += dt;
    this.spawnTimer -= dt * (speed / 0.7);
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = 0.9 + Math.random() * 0.8;
    }

    const collected = { coins: 0, powerups: [] };
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt * speed;

      if (magnetActive && it.kind === 'coin' && Math.abs(it.t - PLAYER_T) < MAGNET_RANGE) {
        it.lane += (playerLane - it.lane) * Math.min(1, dt * 10);
        if (Math.abs(it.lane - playerLane) < 0.05) it.lane = playerLane;
      }

      const onPlayer =
        Math.round(it.lane) === playerLane &&
        Math.abs(it.lane - playerLane) < 0.4 &&
        Math.abs(it.t - PLAYER_T) < COLLECT_WINDOW;

      if (onPlayer || it.t > 1.3) {
        if (onPlayer) {
          if (it.kind === 'coin') collected.coins += 1;
          else collected.powerups.push(it.kind);
        }
        this.items.splice(i, 1);
        this.recycle(it);
        continue;
      }

      const p = project(it.lane, it.t);
      const bob = Math.sin(this.time * 6 + it.t * 20) * 6 * p.scale;
      it.gfx.position.set(p.x, p.y - 30 * p.scale + bob);
      it.gfx.scale.set(p.scale);
      it.gfx.rotation = it.kind === 'coin' ? 0 : this.time * 2;
    }
    return collected;
  }
}
