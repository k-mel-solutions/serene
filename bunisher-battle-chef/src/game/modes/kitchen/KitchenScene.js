import { Container, Graphics, Text } from 'pixi.js';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../../engine.js';
import { FX } from '../../fx.js';
import { TimingBar } from './minigames/TimingBar.js';

// Steps of the signature recipe. `tool` picks the animation; `kind` the ingredient art.
export const RECIPES = {
  'burger-bunisher': {
    label: 'Burger Bunisher',
    steps: [
      { label: 'Toaster le pain', kind: 'pain', tool: 'spatule' },
      { label: 'Saisir le steak', kind: 'steak', tool: 'spatule' },
      { label: 'Trancher la tomate', kind: 'tomate', tool: 'couteau' },
      { label: 'Ciseler la salade', kind: 'salade', tool: 'couteau' },
      { label: 'Fondre le fromage', kind: 'fromage', tool: 'spatule' },
      { label: 'Sauce braise', kind: 'sauce', tool: 'spatule' },
      { label: 'Refermer le pain', kind: 'pain', tool: 'spatule' },
    ],
  },
};

const STEP_TIME_LIMIT = 5; // seconds before a step counts as missed
const RESULT_DELAY = 0.7;

const INGREDIENT_ART = {
  pain: (g) => {
    g.ellipse(0, 0, 70, 34).fill(0xe8a55a);
    g.ellipse(0, -10, 62, 20).fill(0xf2bd7a);
    for (const [x, y] of [[-30, -14], [-8, -20], [14, -16], [32, -8]]) g.ellipse(x, y, 4, 2.5).fill(0xfff1d6);
  },
  steak: (g) => {
    g.ellipse(0, 0, 66, 30).fill(0x5a2f1c);
    g.ellipse(0, -6, 58, 20).fill(0x7a3f26);
    g.rect(-40, -10, 80, 3).fill({ color: 0x2a1208, alpha: 0.7 });
    g.rect(-40, 2, 80, 3).fill({ color: 0x2a1208, alpha: 0.7 });
  },
  tomate: (g) => {
    g.circle(0, 0, 40).fill(0xe2373c);
    g.circle(0, 0, 30).fill(0xff5a5f);
    g.circle(0, 0, 8).fill(0xffd0a0);
    g.roundRect(-6, -48, 12, 12, 4).fill(0x5aa84b);
  },
  salade: (g) => {
    g.ellipse(0, 0, 72, 34).fill(0x6fbf4f);
    g.ellipse(-20, -6, 30, 18).fill(0x9bd36a);
    g.ellipse(24, 4, 26, 16).fill(0x8ccc5a);
  },
  fromage: (g) => {
    g.roundRect(-52, -30, 104, 60, 6).fill(0xf5c542);
    g.roundRect(-52, -30, 104, 12, 6).fill(0xffd96a);
    g.circle(-20, 6, 6).fill(0xe0ac2a);
    g.circle(22, -8, 4).fill(0xe0ac2a);
  },
  sauce: (g) => {
    g.roundRect(-22, -50, 44, 90, 12).fill(0xff6a1a);
    g.roundRect(-14, -66, 28, 20, 6).fill(0x2b2b2b);
    g.roundRect(-14, -20, 28, 30, 4).fill({ color: 0xffffff, alpha: 0.8 });
  },
};

/**
 * Kitchen mode: a chain of timing hits. A cursor sweeps a bar; tap when it
 * sits in the target zone. Perfects build toward a Showdown buff.
 */
export class KitchenScene {
  constructor(canvas, events, recipeId = 'burger-bunisher') {
    this.canvas = canvas;
    this.events = events; // { onTick(hud), onDone(result) }
    this.recipe = RECIPES[recipeId];
    this.container = new Container();
    this.fx = new FX();

    this.bg = new Graphics();
    this.ingredient = new Graphics();
    this.tool = new Graphics();
    this.bar = new TimingBar(DESIGN_WIDTH - 80);
    this.bar.container.position.set(40, 560);
    this.stepText = new Text({
      text: '',
      style: { fontFamily: 'Bangers, Inter, sans-serif', fontSize: 34, fill: 0xfff1d6, stroke: { color: 0x000000, width: 5 }, letterSpacing: 2 },
    });
    this.stepText.anchor.set(0.5);
    this.stepText.position.set(DESIGN_WIDTH / 2, 470);

    this.container.addChild(this.bg, this.ingredient, this.tool, this.stepText, this.bar.container, this.fx.container);
    this.drawBackground();
    this.bindInput();
    this.restart();
  }

  drawBackground() {
    const g = this.bg;
    // tiled wall
    g.rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT).fill(0x2a1810);
    for (let y = 0; y < 260; y += 40) {
      for (let x = (y / 40) % 2 ? -30 : 0; x < DESIGN_WIDTH; x += 60) {
        g.roundRect(x + 2, y + 2, 56, 36, 3).fill(0x3b2418);
      }
    }
    // hood + heat glow
    g.rect(40, 0, DESIGN_WIDTH - 80, 60).fill(0x5a5a66);
    g.rect(60, 60, DESIGN_WIDTH - 120, 8).fill(0x8a8a96);
    // worktop
    g.rect(0, 260, DESIGN_WIDTH, DESIGN_HEIGHT - 260).fill(0x6b6b78);
    g.rect(0, 260, DESIGN_WIDTH, 12).fill(0x9a9aa8);
    // cutting board
    g.roundRect(80, 290, DESIGN_WIDTH - 160, 150, 16).fill(0xb8834a);
    g.roundRect(90, 300, DESIGN_WIDTH - 180, 130, 12).fill(0xcf9a5d);
    // plate for the result
    g.ellipse(DESIGN_WIDTH / 2, 700, 120, 34).fill(0xf0ebe3);
    g.ellipse(DESIGN_WIDTH / 2, 700, 96, 24).fill(0xe2dccf);
  }

  bindInput() {
    this.onKey = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') this.hit();
    };
    this.onPointer = () => this.hit();
    window.addEventListener('keydown', this.onKey);
    this.canvas.addEventListener('pointerdown', this.onPointer);
  }

  restart() {
    this.stepIndex = 0;
    this.results = [];
    this.stepTime = 0;
    this.resultTimer = 0;
    this.done = false;
    this.toolAnim = 0;
    this.time = 0;
    this.beginStep();
  }

  beginStep() {
    const step = this.recipe.steps[this.stepIndex];
    this.stepTime = 0;
    this.stepText.text = step.label;
    this.ingredient.clear();
    INGREDIENT_ART[step.kind](this.ingredient);
    this.ingredient.position.set(DESIGN_WIDTH / 2, 365);
    this.ingredient.scale.set(1);
    this.bar.start(1.0 + this.stepIndex * 0.16, step.tool === 'couteau' ? 0.16 : 0.2);
    this.emitHud();
  }

  hit() {
    if (this.done || this.resultTimer > 0 || !this.bar.active) return;
    const grade = this.bar.judge(); // 'perfect' | 'good' | 'miss'
    this.finishStep(grade);
  }

  finishStep(grade) {
    this.results.push(grade);
    this.bar.stop();
    this.resultTimer = RESULT_DELAY;
    this.toolAnim = 0.35;
    const x = DESIGN_WIDTH / 2;
    if (grade === 'perfect') {
      this.fx.burst(x, 365, 0xf5c542, 18, 240);
      this.fx.text(x, 300, 'PARFAIT !', { color: 0xf5c542, size: 34 });
    } else if (grade === 'good') {
      this.fx.burst(x, 365, 0x9bd36a, 10, 160);
      this.fx.text(x, 300, 'Bien', { color: 0x9bd36a, size: 28 });
    } else {
      this.fx.shake(6, 0.2);
      this.fx.text(x, 300, 'Raté…', { color: 0xff4d5e, size: 28 });
    }
    this.emitHud();
  }

  emitHud() {
    this.events.onTick?.({
      recipe: this.recipe.label,
      steps: this.recipe.steps.map((s, i) => ({
        label: s.label,
        state: i < this.results.length ? this.results[i] : i === this.stepIndex ? 'current' : 'todo',
      })),
      hint: this.recipe.steps[this.stepIndex]?.tool === 'couteau' ? 'Tape quand la lame est dans la zone' : 'Tape au bon moment',
    });
  }

  complete() {
    this.done = true;
    const perfects = this.results.filter((r) => r === 'perfect').length;
    const goods = this.results.filter((r) => r === 'good').length;
    const total = this.results.length;
    const quality = (perfects + goods * 0.6) / total;
    this.events.onDone?.({
      recipe: this.recipe.label,
      perfects,
      goods,
      misses: total - perfects - goods,
      quality,
      xp: Math.round(20 + quality * 60),
      coins: Math.round(quality * 20),
      buff: quality >= 0.7 ? { id: 'sauce-braise', label: 'Sauce braise', damage: 0.2 } : null,
    });
  }

  update(dt) {
    this.time += dt;
    const shake = this.fx.update(dt);
    this.container.position.set(shake.x, shake.y);
    if (this.done) return;

    if (this.resultTimer > 0) {
      this.resultTimer -= dt;
      this.toolAnim = Math.max(0, this.toolAnim - dt);
      this.drawTool(this.bar.cursor, this.toolAnim);
      if (this.resultTimer <= 0) {
        this.stepIndex += 1;
        if (this.stepIndex >= this.recipe.steps.length) this.complete();
        else this.beginStep();
      }
      return;
    }

    this.stepTime += dt;
    this.bar.update(dt);
    this.drawTool(this.bar.cursor, 0);
    this.ingredient.scale.set(1 + Math.sin(this.time * 6) * 0.02);
    if (this.stepTime > STEP_TIME_LIMIT) this.finishStep('miss');
  }

  /** Knife or spatula hovering over the board, following the bar cursor; dips on a hit. */
  drawTool(cursor, dip) {
    const g = this.tool;
    g.clear();
    const step = this.recipe.steps[this.stepIndex];
    if (!step) return;
    const x = 80 + cursor * (DESIGN_WIDTH - 160);
    const y = 300 - 40 + dip * 120;
    if (step.tool === 'couteau') {
      g.poly([x - 6, y, x + 6, y, x + 4, y + 70, x - 8, y + 70]).fill(0xd8dde6);
      g.roundRect(x - 8, y - 40, 16, 44, 5).fill(0x2b2b2b);
    } else {
      g.roundRect(x - 4, y - 40, 8, 60, 3).fill(0x2b2b2b);
      g.roundRect(x - 26, y + 18, 52, 30, 6).fill(0xb9bfca);
      g.rect(x - 20, y + 26, 40, 3).fill({ color: 0x000000, alpha: 0.2 });
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    this.canvas.removeEventListener('pointerdown', this.onPointer);
    this.container.destroy({ children: true });
  }
}
