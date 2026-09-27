// Shared placeholder art for The Bunisher, drawn with Graphics until the
// Higgsfield sprite sheet lands. Used by Rush (with backpack) and Showdown.
export const BUNISHER_ORANGE = 0xff6a1a; // "orange braise" — never used on a rival

/**
 * Draws the Bunisher centered on his feet-ish origin (0, 0) facing the camera.
 * @param g Graphics to draw into (cleared first)
 * @param opts { backpack: bool, facing: 'front'|'right', pose: 'run'|'idle'|'attack'|'hit' }
 */
export function drawBunisher(g, { backpack = false, facing = 'front', pose = 'idle' } = {}) {
  g.clear();
  const dir = facing === 'right' ? 1 : 0;

  // shadow
  g.ellipse(0, 62, 34, 9).fill({ color: 0x000000, alpha: 0.35 });

  if (backpack && facing === 'front') {
    // insulated delivery bag, wider than the shoulders so it reads from the front
    g.roundRect(-44, -26, 88, 62, 10).fill(0x1b1b1f);
    g.roundRect(-44, -26, 88, 10, 6).fill(BUNISHER_ORANGE);
    g.roundRect(-40, -8, 8, 36, 4).fill({ color: 0xffffff, alpha: 0.08 });
    g.roundRect(32, -8, 8, 36, 4).fill({ color: 0xffffff, alpha: 0.08 });
    g.rect(-10, -32, 20, 8).fill(0x333338);
  }

  // legs
  const stride = pose === 'run' ? 6 : 0;
  g.roundRect(-18 - stride, 40, 14, 20, 5).fill(0x1c1c1f);
  g.roundRect(4 + stride, 40, 14, 20, 5).fill(0x1c1c1f);
  g.roundRect(-20 - stride, 54, 18, 8, 4).fill(0x0d0d0f);
  g.roundRect(2 + stride, 54, 18, 8, 4).fill(0x0d0d0f);

  // torso: black chef jacket, orange apron
  g.roundRect(-28, -12, 56, 56, 12).fill(0x26262b);
  g.roundRect(-19, 0, 38, 42, 8).fill(BUNISHER_ORANGE);
  g.roundRect(-19, 0, 38, 6, 3).fill({ color: 0xffffff, alpha: 0.18 });
  g.rect(-12, 10, 24, 2).fill({ color: 0x000000, alpha: 0.25 });
  g.rect(-12, 22, 24, 2).fill({ color: 0x000000, alpha: 0.25 });

  // arms
  if (pose === 'attack') {
    g.roundRect(20, -16, 34, 12, 6).fill(0x26262b);
    g.circle(56, -10, 8).fill(0xe8a55a);
    g.roundRect(-40, -4, 12, 32, 6).fill(0x26262b);
  } else {
    const swing = pose === 'run' ? 8 : 0;
    g.roundRect(-40, -4 + swing, 12, 34, 6).fill(0x26262b);
    g.roundRect(28, -4 - swing, 12, 34, 6).fill(0x26262b);
    g.circle(-34, 32 + swing, 7).fill(0xe8a55a);
    g.circle(34, 32 - swing, 7).fill(0xe8a55a);
  }

  if (backpack && facing === 'right') {
    g.roundRect(-44, -20, 26, 44, 8).fill(0x1b1b1f);
    g.roundRect(-42, -18, 22, 8, 4).fill(BUNISHER_ORANGE);
  }

  // burger-bun head
  const tilt = pose === 'hit' ? 0.15 : 0;
  const hx = dir * 4;
  g.ellipse(hx, -38, 34, 30).fill(0xe8a55a);
  g.ellipse(hx, -48, 30, 16).fill(0xf2bd7a);
  g.ellipse(hx - 10, -56, 12, 6).fill({ color: 0xffffff, alpha: 0.18 });
  for (const [x, y] of [[-14, -54], [-2, -60], [10, -56], [18, -48], [-20, -46]]) {
    g.ellipse(hx + x, y, 3, 2).fill(0xfff1d6);
  }
  // black headband with orange eye slits
  g.rect(hx - 34, -42, 68, 12).fill(0x111111);
  g.rect(hx - 34 + 12, -39 + tilt * 10, 8, 4).fill(BUNISHER_ORANGE);
  g.rect(hx + 34 - 20, -39 - tilt * 10, 8, 4).fill(BUNISHER_ORANGE);
  // mouth
  g.roundRect(hx - 6, -22, 12, 3, 1).fill({ color: 0x5a3a1a, alpha: 0.6 });
}
