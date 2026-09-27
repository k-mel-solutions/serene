import { Container, Graphics } from 'pixi.js';

const HEIGHT = 34;

/**
 * A cursor that ping-pongs across a bar. `judge()` grades the cursor
 * against a target zone (with a tighter "perfect" core).
 */
export class TimingBar {
  constructor(width) {
    this.width = width;
    this.container = new Container();
    this.track = new Graphics();
    this.cursorGfx = new Graphics();
    this.container.addChild(this.track, this.cursorGfx);
    this.cursor = 0;
    this.dir = 1;
    this.speed = 1;
    this.zone = { center: 0.5, half: 0.1 };
    this.active = false;
  }

  /** @param speed sweeps per second  @param zoneWidth fraction of the bar that counts as "good" */
  start(speed, zoneWidth) {
    this.speed = speed;
    this.zone = { center: 0.3 + Math.random() * 0.4, half: zoneWidth / 2 };
    this.cursor = 0;
    this.dir = 1;
    this.active = true;
    this.drawTrack();
  }

  stop() {
    this.active = false;
  }

  judge() {
    const d = Math.abs(this.cursor - this.zone.center);
    if (d <= this.zone.half * 0.35) return 'perfect';
    if (d <= this.zone.half) return 'good';
    return 'miss';
  }

  drawTrack() {
    const g = this.track;
    const w = this.width;
    g.clear();
    g.roundRect(0, 0, w, HEIGHT, HEIGHT / 2).fill(0x1a1022);
    g.roundRect(2, 2, w - 4, HEIGHT - 4, HEIGHT / 2).stroke({ color: 0xffffff, alpha: 0.15, width: 2 });
    const zx = (this.zone.center - this.zone.half) * w;
    const zw = this.zone.half * 2 * w;
    g.roundRect(zx, 4, zw, HEIGHT - 8, 6).fill(0x6fbf4f);
    const px = (this.zone.center - this.zone.half * 0.35) * w;
    const pw = this.zone.half * 0.7 * w;
    g.roundRect(px, 4, pw, HEIGHT - 8, 4).fill(0xf5c542);
  }

  update(dt) {
    if (!this.active) return;
    this.cursor += this.dir * this.speed * dt;
    if (this.cursor >= 1) {
      this.cursor = 1;
      this.dir = -1;
    } else if (this.cursor <= 0) {
      this.cursor = 0;
      this.dir = 1;
    }
    const g = this.cursorGfx;
    g.clear();
    const x = this.cursor * this.width;
    g.roundRect(x - 5, -8, 10, HEIGHT + 16, 4).fill(0xfff1d6);
    g.roundRect(x - 2, -6, 4, HEIGHT + 12, 2).fill(0xff6a1a);
  }
}
