import { Container } from 'pixi.js';
import { Lanes } from './Lanes.js';
import { ObstacleSpawner } from './ObstacleSpawner.js';
import { CoinManager, POWERUPS } from './CoinManager.js';
import { OrderManager, DISHES } from './OrderManager.js';
import { Player } from '../../entities/Player.js';
import { FX } from '../../fx.js';

const BASE_SPEED = 0.55; // depth units / second
const MAX_SPEED = 1.35;
const RAMP_SECONDS = 90; // time to reach max speed
const FOUET_MULT = 1.5;
const SCORE_PER_SECOND = 10;
const SWIPE_THRESHOLD = 30; // px on the canvas

/**
 * Rush mode: the delivery runner. Owns input, speed ramp, scoring and the
 * game-over transition. UI is notified via the `events` callbacks so React
 * can render the HUD without touching Pixi.
 */
export class RushScene {
  constructor(canvas, events) {
    this.canvas = canvas;
    this.events = events; // { onTick(hud), onGameOver(result) }
    this.container = new Container();
    this.world = new Container(); // shaken on hits
    this.container.addChild(this.world);

    this.lanes = new Lanes();
    this.spawner = new ObstacleSpawner();
    this.coins = new CoinManager(this.spawner);
    this.orders = new OrderManager(this.spawner);
    this.player = new Player();
    this.fx = new FX();
    this.world.addChild(
      this.lanes.container,
      this.spawner.container,
      this.coins.container,
      this.orders.container,
      this.player.container,
      this.fx.container,
    );

    this.bindInput();
    this.restart();
  }

  restart() {
    this.elapsed = 0;
    this.score = 0;
    this.coinsCollected = 0;
    this.alive = true;
    this.powerups = { tablier: 0, aimant: 0, fouet: 0 };
    this.spawner.reset();
    this.coins.reset();
    this.orders.reset();
    this.player.reset();
    this.emitHud();
  }

  bindInput() {
    this.onKey = (e) => {
      if (!this.alive) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'q') this.player.moveLeft();
      if (e.key === 'ArrowRight' || e.key === 'd') this.player.moveRight();
    };
    window.addEventListener('keydown', this.onKey);

    let start = null;
    this.onPointerDown = (e) => {
      start = { x: e.clientX, y: e.clientY, handled: false };
    };
    this.onPointerMove = (e) => {
      if (!start || start.handled || !this.alive) return;
      const dx = e.clientX - start.x;
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        start.handled = true;
        dx < 0 ? this.player.moveLeft() : this.player.moveRight();
      }
    };
    this.onPointerUp = (e) => {
      // a plain tap on the left/right half also steers, for desktop mouse users
      if (start && !start.handled && this.alive) {
        const rect = this.canvas.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        e.clientX < mid ? this.player.moveLeft() : this.player.moveRight();
      }
      start = null;
    };
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  get difficulty() {
    return Math.min(1, this.elapsed / RAMP_SECONDS);
  }

  get speed() {
    const base = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * this.difficulty;
    return this.powerups.fouet > 0 ? base * FOUET_MULT : base;
  }

  activate(kind) {
    this.powerups[kind] = POWERUPS[kind].duration;
    if (kind === 'tablier') this.player.activateShield(POWERUPS.tablier.duration);
    this.score += 50;
    const { x, y } = this.player.container.position;
    this.fx.burst(x, y - 30, POWERUPS[kind].color, 16, 220);
    this.fx.text(x, y - 110, POWERUPS[kind].label, { color: POWERUPS[kind].color, size: 22 });
  }

  emitHud() {
    const active = Object.entries(this.powerups)
      .filter(([, t]) => t > 0)
      .map(([kind, t]) => ({ kind, label: POWERUPS[kind].label, remaining: t }));
    this.events.onTick?.({
      score: Math.floor(this.score),
      coins: this.coinsCollected,
      speed: this.speed,
      powerups: active,
      ...this.orders.hudState(),
    });
  }

  update(dt) {
    if (!this.alive) {
      this.world.position.set(0, 0);
      return;
    }
    this.elapsed += dt;
    for (const k in this.powerups) this.powerups[k] = Math.max(0, this.powerups[k] - dt);

    const speed = this.speed;
    this.lanes.update(dt, speed);
    this.spawner.update(dt, speed, this.difficulty);
    const got = this.coins.update(dt, speed, this.player.lane, this.powerups.aimant > 0);
    const orders = this.orders.update(dt, speed, this.player.lane);
    this.player.update(dt);

    const px = this.player.container.x;
    const py = this.player.container.y;

    if (got.coins) {
      this.coinsCollected += got.coins;
      this.score += got.coins * 5;
      this.fx.burst(px, py - 40, 0xf5c542, 4, 120);
    }
    this.score += dt * SCORE_PER_SECOND * (speed / BASE_SPEED);
    for (const kind of got.powerups) this.activate(kind);

    for (const p of orders.pickedUp) {
      this.fx.burst(p.x, p.y, DISHES[p.dish].color, 8, 150);
      this.fx.text(p.x, p.y - 40, DISHES[p.dish].label, { color: 0xffffff, size: 20 });
    }
    for (const d of orders.delivered) {
      this.score += d.points;
      this.coinsCollected += d.tip;
      this.fx.burst(d.x, d.y, 0x4fd1ff, 18, 240);
      this.fx.text(d.x, d.y - 30, `+${d.points}`, { color: 0x4fd1ff, size: 30 });
      if (d.streak > 1) this.fx.text(d.x, d.y + 10, `x${d.streak} !`, { color: 0xf5c542, size: 22 });
    }
    for (const c of orders.cold) {
      this.fx.text(px, py - 120, `${DISHES[c.dish].label} froid…`, { color: 0x9aa0b4, size: 20 });
    }

    if (this.spawner.checkCollision(this.player.lane)) {
      if (this.player.absorbHit()) {
        this.fx.shake(6, 0.2);
      } else {
        this.gameOver();
      }
    }

    const shake = this.fx.update(dt);
    this.world.position.set(shake.x, shake.y);
    this.emitHud();
  }

  gameOver() {
    this.alive = false;
    this.fx.shake(14, 0.35);
    this.fx.burst(this.player.container.x, this.player.container.y - 30, 0xff6a1a, 24, 300);
    this.events.onGameOver?.({
      score: Math.floor(this.score),
      coins: this.coinsCollected,
      deliveries: this.orders.deliveries,
      duration: Math.floor(this.elapsed),
    });
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.container.destroy({ children: true });
  }
}
