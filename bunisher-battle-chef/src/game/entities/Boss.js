import { Container, Graphics } from 'pixi.js';

// Boss roster. Only Gril d'Acier has validated art direction; the rest are
// placeholders in the hub until their designs are approved.
export const BOSSES = {
  'gril-acier': {
    name: "Gril d'Acier",
    district: 'Quartier industriel',
    hp: 100,
    technique: 'acier',
    colors: { body: 0x7d8797, dark: 0x4a5261, light: 0xb4bcc9, glow: 0xff3b3b },
    patterns: [
      { id: 'slam', label: 'Pilon', telegraph: 1.0, strike: 0.3, recover: 1.4, damage: 1 },
      { id: 'sweep', label: 'Balayage', telegraph: 0.65, strike: 0.25, recover: 1.0, damage: 1 },
      { id: 'flare', label: 'Flambée', telegraph: 1.4, strike: 0.4, recover: 1.9, damage: 2 },
    ],
  },
};

/**
 * Gril d'Acier: a hulking steel grill with a red-hot grate for a chest.
 * Never uses the Bunisher's orange — his heat is red.
 */
export class Boss {
  constructor(def) {
    this.def = def;
    this.container = new Container();
    this.body = new Graphics();
    this.container.addChild(this.body);
    this.pose = 'idle';
    this.time = 0;
    this.glow = 0.4;
  }

  setPose(pose) {
    this.pose = pose;
  }

  update(dt, glowLevel = 0.4) {
    this.time += dt;
    this.glow += (glowLevel - this.glow) * Math.min(1, dt * 8);
    this.draw();
  }

  draw() {
    const g = this.body;
    const c = this.def.colors;
    g.clear();
    const breathe = Math.sin(this.time * 2) * 3;
    const lean = this.pose === 'telegraph' ? -18 : this.pose === 'strike' ? 40 : this.pose === 'stunned' ? -30 : 0;
    const drop = this.pose === 'stunned' ? 20 : 0;

    g.ellipse(0, 70, 80, 18).fill({ color: 0x000000, alpha: 0.4 });

    // legs
    g.roundRect(-52, 10 + drop, 30, 62, 8).fill(c.dark);
    g.roundRect(22, 10 + drop, 30, 62, 8).fill(c.dark);
    g.roundRect(-58, 60 + drop, 42, 14, 6).fill(0x2a2e36);
    g.roundRect(16, 60 + drop, 42, 14, 6).fill(0x2a2e36);

    // torso: a grill body with a glowing grate
    g.roundRect(-70 + lean * 0.3, -100 + breathe + drop, 140, 120, 18).fill(c.body);
    g.roundRect(-70 + lean * 0.3, -100 + breathe + drop, 140, 16, 10).fill(c.light);
    g.roundRect(-54 + lean * 0.3, -78 + breathe + drop, 108, 76, 10).fill(0x1a1010);
    // heat behind the grate
    g.roundRect(-54 + lean * 0.3, -78 + breathe + drop, 108, 76, 10).fill({ color: c.glow, alpha: 0.25 + this.glow * 0.6 });
    for (let i = 0; i < 6; i++) {
      g.rect(-50 + lean * 0.3, -72 + i * 12 + breathe + drop, 100, 5).fill(c.dark);
    }
    // rivets
    for (const x of [-60, 60]) for (const y of [-90, -40, 5]) g.circle(x + lean * 0.3, y + breathe + drop, 3).fill(c.light);

    // arms: massive tongs / cleaver arm
    const armY = -70 + breathe + drop;
    const swing = this.pose === 'strike' ? -70 : this.pose === 'telegraph' ? 30 : 0;
    g.roundRect(-112 + lean * 0.3, armY + swing * 0.3, 44, 24, 10).fill(c.dark);
    g.roundRect(-126 + lean * 0.3, armY + swing * 0.3 - 6, 22, 36, 6).fill(c.light);
    g.roundRect(68 + lean * 0.3, armY - swing, 44, 24, 10).fill(c.dark);
    // cleaver
    g.poly([
      110 + lean * 0.3, armY - swing - 40,
      150 + lean * 0.3, armY - swing - 46,
      156 + lean * 0.3, armY - swing + 10,
      110 + lean * 0.3, armY - swing + 12,
    ]).fill(0xd8dde6);
    g.roundRect(102 + lean * 0.3, armY - swing - 4, 14, 26, 5).fill(0x2b2b2b);

    // head: steel chef's toque over a visor
    const hy = -132 + breathe + drop + lean * 0.15;
    g.roundRect(-40 + lean * 0.3, hy, 80, 44, 14).fill(c.body);
    g.roundRect(-34 + lean * 0.3, hy + 14, 68, 14, 6).fill(0x120a0a);
    g.rect(-24 + lean * 0.3, hy + 18, 16, 5).fill({ color: c.glow, alpha: 0.6 + this.glow * 0.4 });
    g.rect(8 + lean * 0.3, hy + 18, 16, 5).fill({ color: c.glow, alpha: 0.6 + this.glow * 0.4 });
    g.roundRect(-36 + lean * 0.3, hy - 34, 72, 40, 16).fill(c.light);
    g.roundRect(-40 + lean * 0.3, hy - 8, 80, 12, 4).fill(c.dark);

    // stun stars
    if (this.pose === 'stunned') {
      for (let i = 0; i < 3; i++) {
        const a = this.time * 4 + (i * Math.PI * 2) / 3;
        g.star(Math.cos(a) * 46, hy - 40 + Math.sin(a) * 12, 5, 9, 4).fill(0xf5c542);
      }
    }
  }
}
