import { Container, Graphics } from 'pixi.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../engine.js';
import { FX } from '../../fx.js';
import { drawBunisher } from '../../entities/bunisherArt.js';
import { Boss, BOSSES } from '../../entities/Boss.js';
import { BossAI } from './BossAI.js';
import { ComboSystem } from './ComboSystem.js';

const FLOOR_Y = 640;
const PLAYER_X = 130;
const BOSS_X = 340;
const PLAYER_MAX_HP = 3;
const DODGE_TIME = 0.45;
const DODGE_COOLDOWN = 0.8;
const ATTACK_TIME = 0.28;
const ATTACK_DAMAGE = 6;
const SPECIAL_DAMAGE_RATIO = 0.25;
const QTE_STEP_TIME = 1.3;
const QTE_KEYS = ['←', '→', '↑', '↓'];
const SWIPE_THRESHOLD = 28;

/**
 * Showdown: a 2D boss duel. Dodge telegraphed strikes, punish the recovery
 * window, parry with a well-timed attack, and finish with a QTE.
 */
export class ShowdownScene {
  constructor(canvas, events, { bossId = 'gril-acier', energy = 0, buffs = [] } = {}) {
    this.canvas = canvas;
    this.events = events; // { onTick(hud), onEnd(result) }
    this.bossDef = BOSSES[bossId];
    this.bossId = bossId;
    this.buffs = buffs;
    this.damageMult = 1 + buffs.reduce((s, b) => s + (b.damage || 0), 0);

    this.container = new Container();
    this.world = new Container();
    this.container.addChild(this.world);

    this.bg = new Graphics();
    this.playerGfx = new Graphics();
    this.boss = new Boss(this.bossDef);
    this.ai = new BossAI(this.bossDef);
    this.combo = new ComboSystem(energy);
    this.fx = new FX();
    this.warning = new Graphics();

    this.boss.container.position.set(BOSS_X, FLOOR_Y - 70);
    this.boss.container.scale.x = -1; // weapon arm toward the player
    this.world.addChild(this.bg, this.warning, this.boss.container, this.playerGfx, this.fx.container);
    this.drawArena();
    this.bindInput();
    this.restart();
  }

  drawArena() {
    const g = this.bg;
    // industrial district: steel beams, furnace glow
    g.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(0x1a1c22);
    g.rect(0, FLOOR_Y - 220, DESIGN_WIDTH, 220).fill(0x23262e);
    for (let x = 30; x < DESIGN_WIDTH; x += 110) {
      g.rect(x, 40, 22, FLOOR_Y - 60).fill(0x30343d);
      for (let y = 60; y < FLOOR_Y - 40; y += 40) g.circle(x + 11, y, 3).fill(0x4a4f5a);
    }
    g.rect(0, 40, DESIGN_WIDTH, 16).fill(0x30343d);
    // furnace window
    g.roundRect(150, 200, 180, 110, 10).fill(0x120a0a);
    g.roundRect(160, 210, 160, 90, 8).fill({ color: 0xff3b3b, alpha: 0.5 });
    for (let i = 0; i < 4; i++) g.rect(160, 218 + i * 22, 160, 6).fill(0x2a2e36);
    // floor: steel plate
    g.rect(0, FLOOR_Y, DESIGN_WIDTH, DESIGN_HEIGHT - FLOOR_Y).fill(0x3a3e48);
    g.rect(0, FLOOR_Y, DESIGN_WIDTH, 8).fill(0x555b68);
    for (let x = 0; x < DESIGN_WIDTH; x += 40) {
      for (let y = FLOOR_Y + 20; y < DESIGN_HEIGHT; y += 40) g.circle(x + 20, y, 3).fill(0x2a2e36);
    }
  }

  bindInput() {
    this.onKey = (e) => {
      if (this.phase === 'qte') {
        const map = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
        if (map[e.key]) this.qteInput(map[e.key]);
        return;
      }
      if (e.key === 'a' || e.key === 'q' || e.key === 'ArrowLeft') this.dodge();
      if (e.key === 'd' || e.code === 'Space' || e.key === 'ArrowRight') this.attack();
      if (e.key === 's' || e.key === 'ArrowDown') this.special();
    };
    window.addEventListener('keydown', this.onKey);

    let start = null;
    this.onPointerDown = (e) => { start = { x: e.clientX, y: e.clientY }; };
    this.onPointerUp = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      start = null;
      if (this.phase === 'qte') {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? '←' : '→') : dy < 0 ? '↑' : '↓';
        this.qteInput(dir);
        return;
      }
      // tap on the canvas: left half dodges, right half attacks (buttons do the same)
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) {
        const rect = this.canvas.getBoundingClientRect();
        e.clientX < rect.left + rect.width / 2 ? this.dodge() : this.attack();
      }
    };
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
  }

  restart() {
    this.phase = 'fight'; // 'fight' | 'qte' | 'won' | 'lost'
    this.playerHp = PLAYER_MAX_HP;
    this.bossHp = this.bossDef.hp;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.attackTimer = 0;
    this.hitTimer = 0;
    this.time = 0;
    this.qte = null;
    this.ai.reset();
    this.combo.reset();
    this.boss.setPose('idle');
    this.emitHud();
  }

  // ---- player actions ----
  dodge() {
    if (this.phase !== 'fight' || this.dodgeCooldown > 0) return;
    this.dodgeTimer = DODGE_TIME;
    this.dodgeCooldown = DODGE_TIME + DODGE_COOLDOWN;
    this.fx.burst(PLAYER_X, FLOOR_Y - 20, 0x4fd1ff, 6, 120);
  }

  attack() {
    if (this.phase !== 'fight' || this.attackTimer > 0 || this.dodgeTimer > 0) return;
    this.attackTimer = ATTACK_TIME;

    if (this.ai.canBeParried) {
      this.ai.parry();
      this.combo.registerParry();
      this.fx.shake(10, 0.3);
      this.fx.burst(BOSS_X - 80, FLOOR_Y - 120, 0xf5c542, 24, 300);
      this.fx.text(DESIGN_WIDTH / 2, 380, 'PARADE !', { color: 0xf5c542, size: 44 });
      this.emitHud();
      return;
    }

    const exposure = this.ai.exposure;
    this.combo.registerHit(exposure);
    const dmg = ATTACK_DAMAGE * exposure * this.combo.multiplier * this.damageMult;
    this.damageBoss(dmg, exposure >= 1 ? 0xff6a1a : 0x9aa4b8);
  }

  special() {
    if (this.phase !== 'fight' || !this.combo.spendSpecial()) return;
    this.ai.stagger(1.2);
    this.fx.shake(16, 0.4);
    this.fx.burst(BOSS_X, FLOOR_Y - 100, 0xff6a1a, 40, 380);
    this.fx.text(DESIGN_WIDTH / 2, 360, 'COUP DE BRAISE !', { color: 0xff6a1a, size: 40 });
    this.damageBoss(this.bossDef.hp * SPECIAL_DAMAGE_RATIO * this.damageMult, 0xff6a1a);
  }

  damageBoss(amount, color) {
    this.bossHp = Math.max(0, this.bossHp - amount);
    this.fx.burst(BOSS_X - 60, FLOOR_Y - 110, color, 10, 200);
    this.fx.text(BOSS_X - 40, FLOOR_Y - 200, `-${Math.round(amount)}`, { color, size: 28 });
    if (this.bossHp <= 0 && this.phase === 'fight') this.startQte();
    this.emitHud();
  }

  // ---- boss strike resolution ----
  bossStrike(pattern) {
    if (this.dodgeTimer > 0) {
      this.fx.text(PLAYER_X, FLOOR_Y - 140, 'Esquive !', { color: 0x4fd1ff, size: 26 });
      this.combo.energy = Math.min(100, this.combo.energy + 4);
      return;
    }
    this.playerHp = Math.max(0, this.playerHp - pattern.damage);
    this.hitTimer = 0.4;
    this.combo.breakCombo();
    this.fx.shake(12, 0.3);
    this.fx.burst(PLAYER_X, FLOOR_Y - 60, 0xff3b3b, 16, 260);
    this.fx.text(PLAYER_X, FLOOR_Y - 150, pattern.label, { color: 0xff3b3b, size: 26 });
    if (this.playerHp <= 0) this.end(false);
  }

  // ---- finisher ----
  startQte() {
    this.phase = 'qte';
    const keys = Array.from({ length: 4 }, () => QTE_KEYS[Math.floor(Math.random() * QTE_KEYS.length)]);
    this.qte = { keys, index: 0, timer: QTE_STEP_TIME };
    this.boss.setPose('stunned');
    this.fx.text(DESIGN_WIDTH / 2, 300, 'FINISH !', { color: 0xf5c542, size: 48 });
    this.emitHud();
  }

  qteInput(dir) {
    if (this.phase !== 'qte') return;
    if (dir === this.qte.keys[this.qte.index]) {
      this.qte.index += 1;
      this.qte.timer = QTE_STEP_TIME;
      this.fx.burst(BOSS_X, FLOOR_Y - 100, 0xf5c542, 14, 260);
      this.fx.shake(8, 0.2);
      if (this.qte.index >= this.qte.keys.length) this.end(true);
    } else {
      this.failQte();
    }
    this.emitHud();
  }

  failQte() {
    // the boss shakes it off and regains a sliver of health
    this.phase = 'fight';
    this.qte = null;
    this.bossHp = this.bossDef.hp * 0.15;
    this.ai.reset();
    this.fx.text(DESIGN_WIDTH / 2, 320, 'Il se relève…', { color: 0x9aa4b8, size: 28 });
    this.emitHud();
  }

  end(won) {
    this.phase = won ? 'won' : 'lost';
    if (won) {
      this.fx.burst(BOSS_X, FLOOR_Y - 100, 0xf5c542, 50, 420);
      this.fx.shake(18, 0.5);
    }
    this.emitHud();
    this.events.onEnd?.({
      won,
      bossId: this.bossId,
      bossName: this.bossDef.name,
      bestCombo: this.combo.best,
      hpLeft: this.playerHp,
      coins: won ? 40 + this.combo.best * 3 : 5,
    });
  }

  emitHud() {
    this.events.onTick?.({
      phase: this.phase,
      playerHp: this.playerHp,
      playerMax: PLAYER_MAX_HP,
      bossHp: this.bossHp,
      bossMax: this.bossDef.hp,
      bossName: this.bossDef.name,
      bossState: this.ai.state,
      energy: this.combo.energy,
      specialReady: this.combo.specialReady,
      combo: this.combo.count,
      canDodge: this.dodgeCooldown <= 0,
      buffs: this.buffs.map((b) => b.label),
      qte: this.qte ? { keys: this.qte.keys, index: this.qte.index, timeRatio: this.qte.timer / QTE_STEP_TIME } : null,
    });
  }

  update(dt) {
    this.time += dt;
    const shake = this.fx.update(dt);
    this.world.position.set(shake.x, shake.y);

    this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.hitTimer = Math.max(0, this.hitTimer - dt);
    this.combo.update(dt);

    if (this.phase === 'fight') {
      const evt = this.ai.update(dt, this.bossHp / this.bossDef.hp);
      if (evt === 'strike') this.bossStrike(this.ai.pattern);
      this.boss.setPose(this.ai.state);
    } else if (this.phase === 'qte') {
      this.qte.timer -= dt;
      if (this.qte.timer <= 0) this.failQte();
    }

    // telegraph warning ring under the boss
    const w = this.warning;
    w.clear();
    if (this.ai.state === 'telegraph' && this.phase === 'fight') {
      const urgency = this.ai.canBeParried ? 1 : 0.5;
      w.ellipse(BOSS_X, FLOOR_Y + 4, 120, 26).stroke({ color: this.ai.canBeParried ? 0xf5c542 : 0xff3b3b, width: 5, alpha: urgency });
    }

    const glow = this.ai.state === 'telegraph' ? 1 : this.ai.state === 'stunned' ? 0.1 : 0.4 + this.ai.aggression * 0.3;
    this.boss.update(dt, glow);

    // player pose
    const pose = this.attackTimer > 0 ? 'attack' : this.hitTimer > 0 ? 'hit' : 'idle';
    drawBunisher(this.playerGfx, { facing: 'right', pose });
    const dodgeOffset = this.dodgeTimer > 0 ? -60 * Math.sin((this.dodgeTimer / DODGE_TIME) * Math.PI) : 0;
    const lunge = this.attackTimer > 0 ? 40 * Math.sin((1 - this.attackTimer / ATTACK_TIME) * Math.PI) : 0;
    this.playerGfx.position.set(PLAYER_X + dodgeOffset + lunge, FLOOR_Y - 62 + Math.sin(this.time * 4) * 2);
    this.playerGfx.alpha = this.dodgeTimer > 0 ? 0.5 : 1;
    this.playerGfx.scale.set(1.15);

    if (this.phase === 'fight' || this.phase === 'qte') this.emitHud();
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.container.destroy({ children: true });
  }
}
