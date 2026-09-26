import { Container } from 'pixi.js';
import { Lanes } from './Lanes.js';
import { ObstacleSpawner } from './ObstacleSpawner.js';
import { CoinManager, POWERUPS } from './CoinManager.js';
import { Player } from '../../entities/Player.js';

const BASE_SPEED = 0.55; // depth units / second
const MAX_SPEED = 1.35;
const RAMP_SECONDS = 90; // time to reach max speed
const FOUET_MULT = 1.5;
const SCORE_PER_SECOND = 10;
const SWIPE_THRESHOLD = 30; // px on the canvas

/**
 * Rush mode: the endless three-lane runner. Owns input, speed ramp, scoring
 * and the game-over transition. UI is notified via the `events` callbacks so
 * React can render the HUD without touching Pixi.
 */
export class RushScene {
  constructor(canvas, events) {
    this.canvas = canvas;
    this.events = events; // { onTick(hud), onGameOver(result) }
    this.container = new Container();

    this.lanes = new Lanes();
    this.spawner = new ObstacleSpawner();
    this.coins = new CoinManager(this.spawner);
    this.player = new Player();
    this.container.addChild(
      this.lanes.container,
      this.spawner.container,
      this.coins.container,
      this.player.container,
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
    });
  }

  update(dt) {
    if (!this.alive) return;
    this.elapsed += dt;
    for (const k in this.powerups) this.powerups[k] = Math.max(0, this.powerups[k] - dt);

    const speed = this.speed;
    this.lanes.update(dt, speed);
    this.spawner.update(dt, speed, this.difficulty);
    const got = this.coins.update(dt, speed, this.player.lane, this.powerups.aimant > 0);
    this.player.update(dt);

    this.coinsCollected += got.coins;
    this.score += got.coins * 5 + dt * SCORE_PER_SECOND * (speed / BASE_SPEED);
    for (const kind of got.powerups) this.activate(kind);

    if (this.spawner.checkCollision(this.player.lane) && !this.player.absorbHit()) {
      this.gameOver();
    }
    this.emitHud();
  }

  gameOver() {
    this.alive = false;
    this.events.onGameOver?.({
      score: Math.floor(this.score),
      coins: this.coinsCollected,
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
