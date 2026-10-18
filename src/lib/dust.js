import { mulberry } from "./motion";

// Floating dust caught in the window light. Each mote stores 9 floats:
// x, y, depth, radius, alpha, phase, driftX, driftY, wobbleRate.
const STRIDE = 9;

export class Motes {
  motes = new Float32Array(0);
  sprite = null;
  width = 0;
  height = 0;

  scatter(width, height) {
    this.width = width;
    this.height = height;
    const count = Math.round(Math.min(56, Math.max(18, (width * height) / 26000)));
    const rand = mulberry(0x1352842);
    this.motes = new Float32Array(STRIDE * count);
    for (let i = 0; i < count; i++) {
      const o = STRIDE * i;
      const depth = rand();
      const bokeh = depth > 0.86; // a few large, out-of-focus discs
      this.motes[o] = rand() * width;
      this.motes[o + 1] = rand() * height;
      this.motes[o + 2] = depth;
      this.motes[o + 3] = bokeh ? 5 + 6 * rand() : 1.1 + rand() * rand() * 1.9;
      this.motes[o + 4] = bokeh ? 0.035 + 0.03 * rand() : 0.1 + 0.16 * rand();
      this.motes[o + 5] = rand() * Math.PI * 2;
      this.motes[o + 6] = (rand() - 0.5) * 8 * (0.4 + depth);
      this.motes[o + 7] = -(1.5 + 6 * rand()) * (0.4 + depth);
      this.motes[o + 8] = 0.14 + 0.26 * rand();
    }
  }

  makeSprite() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(128, 124, 118, 1)");
      g.addColorStop(0.35, "rgba(128, 124, 118, 0.6)");
      g.addColorStop(1, "rgba(128, 124, 118, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
    }
    return canvas;
  }

  draw(ctx, time, dt, strength, parallaxX, parallaxY) {
    this.sprite ||= this.makeSprite();
    const { motes, sprite, width, height } = this;
    for (let o = 0; o < motes.length; o += STRIDE) {
      let x = motes[o] + motes[o + 6] * dt;
      let y = motes[o + 1] + motes[o + 7] * dt;
      if (y < -28) y = height + 28;
      if (x < -28) x = width + 28;
      else if (x > width + 28) x = -28;
      motes[o] = x;
      motes[o + 1] = y;
      const depth = motes[o + 2];
      const phase = motes[o + 5];
      const rate = motes[o + 8];
      const r = motes[o + 3];
      const px = x + 12 * Math.sin(time * rate + phase) + parallaxX * (0.3 + depth);
      const py = y + 7 * Math.cos(time * rate * 0.8 + 1.7 * phase) + parallaxY * (0.3 + depth);
      const twinkle = 0.78 + 0.22 * Math.sin(0.7 * time + 3 * phase);
      ctx.globalAlpha = motes[o + 4] * twinkle * strength;
      ctx.drawImage(sprite, px - r, py - r, 2 * r, 2 * r);
    }
    ctx.globalAlpha = 1;
  }
}
