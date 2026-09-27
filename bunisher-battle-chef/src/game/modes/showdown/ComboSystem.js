const COMBO_WINDOW = 2.2; // seconds between hits before the combo drops
export const MAX_ENERGY = 100;

/**
 * Tracks consecutive hits and the energy gauge that powers the special move.
 * Energy carried over from Rush/Kitchen seeds the gauge at fight start.
 */
export class ComboSystem {
  constructor(startEnergy = 0) {
    this.startEnergy = startEnergy;
    this.reset();
  }

  reset() {
    this.count = 0;
    this.timer = 0;
    this.energy = Math.min(MAX_ENERGY, this.startEnergy);
    this.best = 0;
  }

  get multiplier() {
    return 1 + Math.min(this.count, 10) * 0.08;
  }

  get specialReady() {
    return this.energy >= MAX_ENERGY;
  }

  registerHit(exposure) {
    this.count += 1;
    this.best = Math.max(this.best, this.count);
    this.timer = COMBO_WINDOW;
    this.energy = Math.min(MAX_ENERGY, this.energy + (exposure >= 1 ? 9 : 5));
  }

  registerParry() {
    this.energy = Math.min(MAX_ENERGY, this.energy + 25);
  }

  spendSpecial() {
    if (!this.specialReady) return false;
    this.energy = 0;
    return true;
  }

  breakCombo() {
    this.count = 0;
    this.timer = 0;
  }

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.count = 0;
    }
  }
}
