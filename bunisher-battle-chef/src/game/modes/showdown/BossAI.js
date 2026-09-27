const PARRY_WINDOW = 0.22; // last seconds of a telegraph during which an attack parries
const STUN_TIME = 2.6;

/**
 * Boss state machine: idle → telegraph → strike → recover → idle.
 * The scene reads `state` to decide damage taken and calls `strikeLanded()`
 * during the strike frame. `parry()` interrupts a telegraph into a stun.
 */
export class BossAI {
  constructor(def) {
    this.def = def;
    this.reset();
  }

  reset() {
    this.state = 'idle';
    this.timer = 1.5;
    this.pattern = null;
    this.struck = false;
    this.aggression = 0;
  }

  pickPattern() {
    const p = this.def.patterns;
    // flare only once the boss is warmed up
    const pool = this.aggression < 0.35 ? p.filter((x) => x.id !== 'flare') : p;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  get canBeParried() {
    return this.state === 'telegraph' && this.timer <= PARRY_WINDOW;
  }

  /** How exposed the boss is: 1 = full damage, 0.5 = guarded. */
  get exposure() {
    return this.state === 'recover' || this.state === 'stunned' ? 1 : 0.5;
  }

  parry() {
    this.state = 'stunned';
    this.timer = STUN_TIME;
    this.pattern = null;
  }

  /** Stagger from the special: brief stun. */
  stagger(seconds = 1.2) {
    this.state = 'stunned';
    this.timer = seconds;
    this.pattern = null;
  }

  /**
   * @param dt seconds
   * @param hpRatio boss hp ratio, used to speed up when low
   * @returns {'strike'|null} 'strike' on the exact frame the hit lands
   */
  update(dt, hpRatio) {
    this.aggression = 1 - hpRatio;
    const haste = 1 + this.aggression * 0.35;
    this.timer -= dt * (this.state === 'stunned' ? 1 : haste);
    if (this.timer > 0) return null;

    switch (this.state) {
      case 'idle':
        this.pattern = this.pickPattern();
        this.state = 'telegraph';
        this.timer = this.pattern.telegraph;
        this.struck = false;
        return null;
      case 'telegraph':
        this.state = 'strike';
        this.timer = this.pattern.strike;
        return 'strike';
      case 'strike':
        this.state = 'recover';
        this.timer = this.pattern.recover;
        return null;
      case 'recover':
      case 'stunned':
        this.state = 'idle';
        this.timer = 0.6 + Math.random() * 0.8 - this.aggression * 0.4;
        return null;
      default:
        return null;
    }
  }
}
