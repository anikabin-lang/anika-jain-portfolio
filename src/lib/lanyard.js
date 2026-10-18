// Physics for the hanging badge: a stiff-but-stretchy lanyard from a moving
// pivot to a clasp, and a rigid arm from the clasp down to the card's centre of
// mass. Integrated with fixed sub-steps (XPBD-style constraints), plus damped
// oscillators for rope bending and the card's yaw/pitch.

const SUBSTEP = 1 / 600;

export function lanyardParams(scale, ropeLength) {
  return {
    gravity: 5200 * scale,
    ropeLength,
    cardArm: 294.08 * scale,
    cardMass: 1,
    claspMass: 0.1,
    stiffness: 400,
    stretchDamping: 0.6 * Math.sqrt(440),
    cardDrag: 0.85,
    claspDrag: 10,
    bendFrequency: 2 * Math.PI * 2,
    bendDamping: 0.35,
    bendGain: 1.6,
    yawFrequency: 2 * Math.PI * 0.5,
    yawDamping: 0.4,
    pitchFrequency: 2 * Math.PI * 0.55,
    pitchDamping: 0.5,
    yawFromSwing: 3e-4 / scale,
  };
}

export class Lanyard {
  pivotX = 0; pivotY = 0; pivotVX = 0; pivotVY = 0;
  holeX = 0; holeY = 0; holeVX = 0; holeVY = 0;
  cardX = 0; cardY = 0; cardVX = 0; cardVY = 0;
  bend1 = 0; bend2 = 0; bend1V = 0; bend2V = 0;
  yaw = 0; pitch = 0; yawV = 0; pitchV = 0;
  angle = 0; ropeAngle = 0; stretch = 0; slack = 0;
  tension = 1; amplitude = 0; swingAngle = 0;

  constructor(params) {
    this.params = params;
  }

  get restStretch() {
    const p = this.params;
    return ((p.cardMass + p.claspMass) * p.gravity) / p.stiffness;
  }

  // Places the badge hanging from (x, y), tilted by `angle`, moving at (vx, vy).
  reset(x, y, angle = 0, vx = 0, vy = 0) {
    const p = this.params;
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const len = p.ropeLength + this.restStretch;
    this.pivotX = x;
    this.pivotY = y;
    this.pivotVX = vx;
    this.pivotVY = vy;
    this.holeX = x - s * len;
    this.holeY = y + c * len;
    this.cardX = this.holeX - s * p.cardArm;
    this.cardY = this.holeY + c * p.cardArm;
    this.holeVX = this.cardVX = vx;
    this.holeVY = this.cardVY = vy;
    this.bend1 = this.bend2 = this.bend1V = this.bend2V = 0;
    this.yaw = this.pitch = this.yawV = this.pitchV = 0;
    this.tension = 1;
    this.readOut(0);
    this.amplitude = Math.abs(angle);
  }

  // Keeps the current swing when the layout scale changes.
  rescale(x, y, k) {
    this.holeX = x + (this.holeX - this.pivotX) * k;
    this.holeY = y + (this.holeY - this.pivotY) * k;
    this.cardX = x + (this.cardX - this.pivotX) * k;
    this.cardY = y + (this.cardY - this.pivotY) * k;
    this.pivotX = x;
    this.pivotY = y;
    this.holeVX *= k; this.holeVY *= k;
    this.cardVX *= k; this.cardVY *= k;
    this.bend1 *= k; this.bend2 *= k;
    this.bend1V *= k; this.bend2V *= k;
  }

  push(vx, vy = 0) { this.cardVX += vx; this.cardVY += vy; }
  spin(yaw, pitch = 0) { this.yawV += yaw; this.pitchV += pitch; }
  pluck(v) { this.bend1V += v; }
  setPose(yaw, pitch) { this.yaw = yaw; this.pitch = pitch; this.yawV = 0; this.pitchV = 0; }

  // target: { pivotX, pivotY, wind, bow, yaw, pitch }
  step(dt, target) {
    const p = this.params;
    const h = Math.min(dt, 0.05);
    if (h <= 0) return;
    const steps = Math.max(1, Math.round(h / SUBSTEP));
    const s = h / steps;
    const invClasp = 1 / p.claspMass;
    const invCard = 1 / p.cardMass;
    const compliance = 1 / p.stiffness;
    const alpha = compliance / (s * s);
    const gamma = (compliance * p.stretchDamping) / s;
    const claspDecay = Math.exp(-p.claspDrag * s);
    const cardDecay = Math.exp(-p.cardDrag * s);
    const weight = (p.cardMass + p.claspMass) * p.gravity;

    const px0 = this.pivotX;
    const py0 = this.pivotY;
    const dpx = (target.pivotX - px0) / steps;
    const dpy = (target.pivotY - py0) / steps;
    const pivotVX = (target.pivotX - px0) / h;
    const pivotVY = (target.pivotY - py0) / h;
    const pivotAX = (pivotVX - this.pivotVX) / h;
    const pivotAY = (pivotVY - this.pivotVY) / h;
    this.pivotVX = pivotVX;
    this.pivotVY = pivotVY;

    for (let i = 0; i < steps; i++) {
      const pivX = px0 + dpx * (i + 1);
      const pivY = py0 + dpy * (i + 1);

      this.holeVY += p.gravity * s;
      this.cardVY += p.gravity * s;
      this.cardVX += target.wind * s;
      this.holeVX *= claspDecay;
      this.holeVY *= claspDecay;
      this.cardVX *= cardDecay;
      this.cardVY *= cardDecay;

      const hx0 = this.holeX, hy0 = this.holeY;
      const cx0 = this.cardX, cy0 = this.cardY;
      const hvx0 = this.holeVX, hvy0 = this.holeVY;
      this.holeX += this.holeVX * s;
      this.holeY += this.holeVY * s;
      this.cardX += this.cardVX * s;
      this.cardY += this.cardVY * s;

      let lambda = 0;
      for (let k = 0; k < 2; k++) {
        // Lanyard: one-sided (it can go slack), compliant and damped.
        let dx = this.holeX - pivX;
        let dy = this.holeY - pivY;
        let d = Math.hypot(dx, dy) || 1e-6;
        const over = d - p.ropeLength;
        if (over > 0) {
          const nx = dx / d, ny = dy / d;
          const dl =
            (-over - alpha * lambda - gamma * (nx * (this.holeX - hx0 - dpx) + ny * (this.holeY - hy0 - dpy))) /
            ((1 + gamma) * invClasp + alpha);
          lambda += dl;
          this.holeX += invClasp * dl * nx;
          this.holeY += invClasp * dl * ny;
        }
        // Card arm: rigid.
        dx = this.cardX - this.holeX;
        dy = this.cardY - this.holeY;
        d = Math.hypot(dx, dy) || 1e-6;
        const nx = dx / d, ny = dy / d;
        const dl = -(d - p.cardArm) / (invClasp + invCard);
        this.cardX += invCard * dl * nx;
        this.cardY += invCard * dl * ny;
        this.holeX -= invClasp * dl * nx;
        this.holeY -= invClasp * dl * ny;
      }

      this.holeVX = (this.holeX - hx0) / s;
      this.holeVY = (this.holeY - hy0) / s;
      this.cardVX = (this.cardX - cx0) / s;
      this.cardVY = (this.cardY - cy0) / s;

      const pull = Math.max(0, -lambda / (s * s)) / weight;
      this.tension += (pull - this.tension) * Math.min(1, 40 * s);

      // Rope bending, driven by sideways pivot and clasp acceleration.
      const rx = this.holeX - pivX;
      const ry = this.holeY - pivY;
      const rl = Math.hypot(rx, ry) || 1e-6;
      const tx = ry / rl;
      const ty = -rx / rl;
      const claspAX = (this.holeVX - hvx0) / s;
      const claspAY = (this.holeVY - hvy0) / s;
      const drive = -pivotAX * tx + (p.gravity - pivotAY) * ty;
      const react = -(claspAX * tx + claspAY * ty);
      const tune = Math.sqrt(Math.min(3, Math.max(0.08, this.tension)));
      const w1 = p.bendFrequency * tune;
      const w2 = 2 * w1;
      const f1 = p.bendGain * (2 / Math.PI) * (drive + react);
      const f2 = p.bendGain * (1 / Math.PI) * (drive - react);
      this.bend1V += (f1 - 2 * p.bendDamping * w1 * this.bend1V - w1 * w1 * (this.bend1 - target.bow)) * s;
      this.bend1 += this.bend1V * s;
      this.bend2V += (f2 - 2 * p.bendDamping * w2 * this.bend2V - w2 * w2 * this.bend2) * s;
      this.bend2 += this.bend2V * s;

      // The card yaws a little as it swings sideways.
      const yawGoal = target.yaw + p.yawFromSwing * (this.cardVX - pivotVX);
      this.yawV += (-2 * p.yawDamping * p.yawFrequency * this.yawV - p.yawFrequency ** 2 * (this.yaw - yawGoal)) * s;
      this.yaw += this.yawV * s;
      this.pitchV +=
        (-2 * p.pitchDamping * p.pitchFrequency * this.pitchV - p.pitchFrequency ** 2 * (this.pitch - target.pitch)) * s;
      this.pitch += this.pitchV * s;
    }
    this.pivotX = target.pivotX;
    this.pivotY = target.pivotY;
    this.readOut(h);
  }

  readOut(dt) {
    const p = this.params;
    const rx = this.holeX - this.pivotX;
    const ry = this.holeY - this.pivotY;
    const rl = Math.hypot(rx, ry);
    this.angle = Math.atan2(-(this.cardX - this.holeX), this.cardY - this.holeY);
    this.ropeAngle = Math.atan2(-rx, ry);
    this.stretch = Math.max(0, rl - p.ropeLength);
    this.slack = Math.max(0, p.ropeLength - rl);
    const previous = this.swingAngle;
    this.swingAngle = Math.atan2(-(this.cardX - this.pivotX), this.cardY - this.pivotY);
    if (dt > 0) {
      // Pendulum energy expressed as an equivalent amplitude.
      const omega = Math.sqrt(p.gravity / (p.ropeLength + p.cardArm));
      const rate = (this.swingAngle - previous) / dt;
      const amp = Math.hypot(this.swingAngle, rate / omega);
      this.amplitude += (amp - this.amplitude) * Math.min(1, 12 * dt);
    }
  }
}

// ——— Rope rendering ———————————————————————————————————————————————

export const STEEL = [
  [0, "#6f6a63"],
  [0.22, "#d9d5ce"],
  [0.4, "#ffffff"],
  [0.62, "#a8a39b"],
  [0.82, "#e6e2dc"],
  [1, "#7d7870"],
];

const N = 28;
const xs = new Float32Array(N);
const ys = new Float32Array(N);
const nx = new Float32Array(N);
const ny = new Float32Array(N);
const along = new Float32Array(N);

// Strokes the rope centre-line offset sideways by `offset`, from point `from`.
function ropePath(ctx, offset, from, lead = 0) {
  const x = xs[from] + nx[from] * offset;
  const y = ys[from] + ny[from] * offset;
  ctx.beginPath();
  if (lead > 0) {
    ctx.moveTo(x + ny[from] * lead, y - nx[from] * lead);
    ctx.lineTo(x, y);
  } else ctx.moveTo(x, y);
  for (let i = from + 1; i < N - 1; i++) {
    const ax = xs[i] + nx[i] * offset;
    const ay = ys[i] + ny[i] * offset;
    const bx = xs[i + 1] + nx[i + 1] * offset;
    const by = ys[i + 1] + ny[i + 1] * offset;
    ctx.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
  }
  ctx.lineTo(xs[N - 1] + nx[N - 1] * offset, ys[N - 1] + ny[N - 1] * offset);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The woven texture: little ellipses stepped along the strap.
function weave(ctx, width, step, side, start, top) {
  const rx = 0.44 * width;
  const ry = 0.215 * width;
  const total = along[0];
  ctx.beginPath();
  let seg = N - 1;
  for (let d = start; d < total; d += step) {
    while (seg > 1 && along[seg - 1] < d) seg--;
    const span = along[seg - 1] - along[seg] || 1;
    const t = (d - along[seg]) / span;
    const x = xs[seg] + (xs[seg - 1] - xs[seg]) * t;
    const y = ys[seg] + (ys[seg - 1] - ys[seg]) * t;
    if (y < top) break;
    const dx = xs[seg] - xs[seg - 1];
    const dy = ys[seg] - ys[seg - 1];
    const dl = Math.hypot(dx, dy) || 1;
    const cx = x + (dy / dl) * width * 0.2 * side;
    const cy = y + (-dx / dl) * width * 0.2 * side;
    const rot = Math.atan2(dy, dx) + 0.56 * side;
    ctx.moveTo(cx + Math.cos(rot) * rx, cy + Math.sin(rot) * rx);
    ctx.ellipse(cx, cy, rx, ry, rot, 0, 2 * Math.PI);
  }
  ctx.fill();
  ctx.stroke();
}

function steel(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, color] of STEEL) g.addColorStop(at, color);
  return g;
}

// rope: { pivotX, pivotY, holeX, holeY, bend1, bend2, slack, scale, shadowX, shadowY }
export function drawRope(ctx, rope) {
  const u = rope.scale;
  const width = 8.4 * u;
  let dx = rope.holeX - rope.pivotX;
  let dy = rope.holeY - rope.pivotY;
  const dist = Math.hypot(dx, dy) || 1;
  dx /= dist;
  dy /= dist;
  // The strap ends at the top of the clasp, 43u above the hole.
  const endX = rope.holeX - 43 * dx * u;
  const endY = rope.holeY - 43 * dy * u;
  const length = Math.max(1, dist - 43 * u);
  const sx = dy;
  const sy = -dx;
  let bow = rope.bend1;
  if (rope.slack > 0.5) {
    const sag = Math.min(0.45 * length, ((2 * length) / Math.PI) * Math.sqrt(rope.slack / length));
    bow += bow >= 0 ? sag : -sag;
  }
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const off = bow * Math.sin(Math.PI * t) + rope.bend2 * Math.sin(2 * Math.PI * t);
    xs[i] = rope.pivotX + (endX - rope.pivotX) * t + sx * off;
    ys[i] = rope.pivotY + (endY - rope.pivotY) * t + sy * off;
  }
  along[N - 1] = 0;
  for (let i = N - 2; i >= 0; i--) along[i] = along[i + 1] + Math.hypot(xs[i + 1] - xs[i], ys[i + 1] - ys[i]);
  for (let i = 0; i < N; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(N - 1, i + 1);
    const tx = xs[b] - xs[a];
    const ty = ys[b] - ys[a];
    const tl = Math.hypot(tx, ty) || 1;
    nx[i] = ty / tl;
    ny[i] = -tx / tl;
  }
  const top = -3 * width;
  let first = 0;
  while (first < N - 3 && ys[first + 1] < top) first++;

  // Soft shadow on the wall.
  ctx.lineJoin = "round";
  ctx.save();
  ctx.translate(rope.shadowX, rope.shadowY);
  ctx.lineCap = "round";
  const lead = Math.abs(rope.shadowY) + 60 * u;
  for (const [spread, alpha] of [[22, 0.011], [15, 0.014], [9, 0.018], [4, 0.022]]) {
    ctx.strokeStyle = `rgba(74, 56, 34, ${alpha})`;
    ctx.lineWidth = width + spread * u;
    ropePath(ctx, 0, first, lead);
    ctx.stroke();
    ctx.lineWidth = (13 + spread) * u;
    ctx.beginPath();
    ctx.moveTo(rope.holeX - 45 * dx * u, rope.holeY - 45 * dy * u);
    ctx.lineTo(rope.holeX - 28 * dx * u, rope.holeY - 28 * dy * u);
    ctx.stroke();
  }
  ctx.restore();

  // Strap body and woven surface.
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#c6beb1";
  ctx.lineWidth = width + 1.1 * u;
  ropePath(ctx, 0, first);
  ctx.stroke();
  ctx.strokeStyle = "#e0dacf";
  ctx.lineWidth = width - 0.4 * u;
  ropePath(ctx, 0, first);
  ctx.stroke();
  const step = 0.62 * width;
  ctx.lineWidth = Math.max(0.5, 0.55 * u);
  ctx.strokeStyle = "rgba(96, 78, 56, 0.3)";
  ctx.fillStyle = "#f5f1ea";
  weave(ctx, width, step, 1, step, top);
  ctx.fillStyle = "#ffffff";
  weave(ctx, width, step, -1, 0.5 * step, top);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.62)";
  ctx.lineWidth = 0.16 * width;
  ropePath(ctx, -0.27 * width, first);
  ctx.stroke();
  ctx.strokeStyle = "rgba(88, 70, 46, 0.15)";
  ctx.lineWidth = 0.3 * width;
  ropePath(ctx, 0.32 * width, first);
  ctx.stroke();

  // Steel clasp: ring loop, crimp and swivel barrel.
  ctx.save();
  ctx.translate(rope.holeX, rope.holeY);
  ctx.rotate(Math.atan2(-dx, dy));
  ctx.scale(u, u);
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = "rgba(52, 44, 34, 0.5)";
  ctx.beginPath();
  ctx.ellipse(0, -11.5, 5.2, 14.5, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = 2.3;
  ctx.strokeStyle = steel(ctx, -6, -26, 6, 3);
  ctx.beginPath();
  ctx.ellipse(0, -11.5, 5.2, 14.5, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = steel(ctx, -3.5, 0, 3.5, 0);
  ctx.strokeStyle = "rgba(52, 44, 34, 0.5)";
  ctx.lineWidth = 0.6;
  roundRect(ctx, -3.5, -31.5, 7, 9.5, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = steel(ctx, -6.5, 0, 6.5, 0);
  roundRect(ctx, -6.5, -45, 13, 17, 2.6);
  ctx.fill();
  ctx.stroke();
  for (const t of [0.24, 0.76]) {
    const y = -45 + 17 * t;
    ctx.fillStyle = "rgba(44, 38, 30, 0.3)";
    ctx.fillRect(-6.1, y, 12.2, 0.9);
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(-6.1, y + 0.9, 12.2, 0.6);
  }
  ctx.restore();
}
