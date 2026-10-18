import { mulberry } from "./motion";

// A procedurally grown branch whose shadow falls across the wall. It sways
// with the shared breeze; leaves flutter and turn individually.
const SIDE_JOINTS = [1, 2, 4, 5, 7];

export class Foliage {
  constructor(shape) {
    // shape: { rootX, rootY (fractions of canvas), heading (rad), reach
    //          (fraction of width), bow, shade (css colour), seed }
    this.shape = shape;
    this.limbs = [];
    this.leaves = [];
    this.width = 0;
    this.height = 0;
    this.ratio = 1;
    this.size = 0;
    this.drawnAt = -Infinity;
    this.grow();
  }

  // Sizes the canvas backing store (rendered at half resolution: it is blurred
  // anyway). Returns true when anything changed.
  fit(canvas) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const ratio = 0.5 * Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.width && h === this.height && ratio === this.ratio) return false;
    this.width = w;
    this.height = h;
    this.ratio = ratio;
    this.size = this.shape.reach * w;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    this.drawnAt = -Infinity;
    return true;
  }

  grow() {
    const rand = mulberry(this.shape.seed);
    const between = (a, b) => a + (b - a) * rand();
    const segments = (count, length, bend) => ({
      lengths: Array.from({ length: count }, () => (length / count) * between(0.82, 1.18)),
      turns: Array.from({ length: count }, () => bend / count + between(-0.07, 0.07)),
    });

    this.limbs.push({
      parent: -1,
      joint: 0,
      angle: 0,
      ...segments(8, 1, this.shape.bow),
      base: 0.016,
      tip: 0.005,
      sway: 0.012,
      rate: between(0.25, 0.35),
      phase: between(0, 2 * Math.PI),
    });
    SIDE_JOINTS.forEach((joint, i) => {
      const side = i % 2 ? 1 : -1;
      const along = joint / 8;
      this.limbs.push({
        parent: 0,
        joint,
        angle: side * between(0.5, 0.82),
        ...segments(3, (0.36 - 0.17 * along) * between(0.8, 1.15), -side * between(0.1, 0.35)),
        base: 0.0075,
        tip: 0.0035,
        sway: between(0.018, 0.032),
        rate: between(0.45, 0.8),
        phase: between(0, 2 * Math.PI),
      });
    });

    this.limbs.forEach((limb, li) => {
      const count = limb.lengths.length;
      for (let j = 1; j <= count; j++) {
        const branchAt = li === 0 ? SIDE_JOINTS.indexOf(j) : -1;
        const sides = j === count ? [0] : branchAt >= 0 ? [branchAt % 2 ? -1 : 1] : [-1, 1];
        const scale = (li === 0 ? 1 : 0.88) * (1 - (j / count) * 0.3);
        for (const side of sides) {
          if (side !== 0 && rand() < 0.18) continue;
          const length = (side === 0 ? 0.13 : between(0.12, 0.16)) * scale;
          this.leaves.push({
            limb: li,
            joint: j,
            angle: side === 0 ? between(-0.12, 0.12) : side * between(0.42, 0.8),
            length,
            width: length * between(0.1, 0.13),
            curl: between(-0.07, 0.07),
            flutter: between(0.05, 0.11),
            rate: between(1.1, 2.3),
            phase: between(0, 2 * Math.PI),
            spin: between(0.4, 1.1),
            spinPhase: between(0, 2 * Math.PI),
          });
        }
      }
    });

    const joints = () => this.limbs.map((l) => new Float32Array(l.lengths.length + 1));
    this.xs = joints();
    this.ys = joints();
    this.headings = joints();
    this.stalks = new Float32Array(4 * this.leaves.length);
  }

  pose(time, air) {
    const { limbs, xs, ys, headings, size } = this;
    limbs.forEach((limb, li) => {
      let x, y, heading;
      if (limb.parent < 0) {
        x = this.shape.rootX * this.width;
        y = this.shape.rootY * this.height;
        heading = this.shape.heading;
      } else {
        x = xs[limb.parent][limb.joint];
        y = ys[limb.parent][limb.joint];
        heading = headings[limb.parent][limb.joint] + limb.angle;
      }
      const sway = -0.05 * air + Math.sin(time * limb.rate + limb.phase) * limb.sway;
      const count = limb.lengths.length;
      xs[li][0] = x;
      ys[li][0] = y;
      headings[li][0] = heading;
      for (let s = 0; s < count; s++) {
        heading += limb.turns[s] + 0.4 * sway * ((s + 1) / count);
        x += Math.cos(heading) * limb.lengths[s] * size;
        y += Math.sin(heading) * limb.lengths[s] * size;
        xs[li][s + 1] = x;
        ys[li][s + 1] = y;
        headings[li][s + 1] = heading;
      }
    });
  }

  // Draws at most ~30fps; the shadow is soft enough that more is wasted work.
  draw(ctx, time, air) {
    if (!this.size || time - this.drawnAt < 1 / 30 - 0.001) return;
    this.drawnAt = time;
    this.pose(time, air);
    const { limbs, leaves, xs, ys, headings, stalks, size } = this;

    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = ctx.strokeStyle = this.shape.shade;
    ctx.lineCap = "round";

    limbs.forEach((limb, li) => {
      const count = limb.lengths.length;
      for (let s = 0; s < count; s++) {
        ctx.lineWidth = Math.max(0.6, (limb.base + (limb.tip - limb.base) * (s / (count - 1))) * size);
        ctx.beginPath();
        ctx.moveTo(xs[li][s], ys[li][s]);
        ctx.lineTo(xs[li][s + 1], ys[li][s + 1]);
        ctx.stroke();
      }
    });

    const gust = 0.45 + 0.55 * Math.abs(air);
    const stalk = 0.012 * size;
    ctx.beginPath();
    leaves.forEach((leaf, i) => {
      const base = headings[leaf.limb][leaf.joint] + leaf.angle;
      const angle =
        base + 0.2 * Math.cos(base) - 0.1 * air + Math.sin(time * leaf.rate + leaf.phase) * leaf.flutter * gust;
      // Leaves foreshorten as they turn on their stalks.
      const turn = 1 - 0.42 * gust * (0.5 - 0.5 * Math.cos(time * leaf.spin + leaf.spinPhase));
      const cx = Math.cos(angle);
      const cy = Math.sin(angle);
      const ox = xs[leaf.limb][leaf.joint];
      const oy = ys[leaf.limb][leaf.joint];
      const x = ox + cx * stalk;
      const y = oy + cy * stalk;
      stalks[4 * i] = ox;
      stalks[4 * i + 1] = oy;
      stalks[4 * i + 2] = x;
      stalks[4 * i + 3] = y;

      const len = leaf.length * size;
      const wid = leaf.width * size * turn;
      const curl = leaf.curl * len;
      const a1 = 1.45 * wid + 0.02 * curl;
      const b1 = 0.02 * curl - 1.45 * wid;
      const a2 = 1.2 * wid + 0.38 * curl;
      const b2 = 0.38 * curl - 1.2 * wid;
      const tipX = x + cx * len - cy * curl;
      const tipY = y + cy * len + cx * curl;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + cx * len * 0.15 - cy * a1, y + cy * len * 0.15 + cx * a1,
        x + cx * len * 0.62 - cy * a2, y + cy * len * 0.62 + cx * a2,
        tipX, tipY,
      );
      ctx.bezierCurveTo(
        x + cx * len * 0.62 - cy * b2, y + cy * len * 0.62 + cx * b2,
        x + cx * len * 0.15 - cy * b1, y + cy * len * 0.15 + cx * b1,
        x, y,
      );
      ctx.closePath();
    });
    ctx.fill();

    ctx.lineWidth = Math.max(0.6, 0.004 * size);
    ctx.beginPath();
    for (let i = 0; i < stalks.length; i += 4) {
      ctx.moveTo(stalks[i], stalks[i + 1]);
      ctx.lineTo(stalks[i + 2], stalks[i + 3]);
    }
    ctx.stroke();
  }
}
