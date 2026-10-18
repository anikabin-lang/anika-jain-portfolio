import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, clamp, smoothstep, prefersReducedMotion } from "../lib/motion";
import { Lanyard, lanyardParams, drawRope, STEEL } from "../lib/lanyard";
import { Motes } from "../lib/dust";
import { Foliage } from "../lib/foliage";
import { direction, STAGE_LAYOUT } from "../lib/direction";
import { whenLifted } from "../lib/lift";

const DEG = Math.PI / 180;
const DROP_TILT = 13 * DEG; // swing the badge enters with
const SETTLED = 9 * DEG; // amplitude below which the intro counts as settled
const POINTER_YAW = 8 * DEG;
const POINTER_PITCH = 5 * DEG;
const PLACED = { off: 0.05, swing: 3 * DEG };
const CLOSING_TILT = 8 * DEG;

// Window-light branch shadow on the hero wall.
const BRANCH = { rootX: -0.06, rootY: 0.2, heading: 0.5, reach: 0.92, bow: 0.3, shade: "rgb(88 70 48)", seed: 0x1352889 };

// Critically-damped follow with a speed limit, for scroll-driven targets.
const follow = (from, to, dt, maxRate) => {
  const d = to - from;
  if (Math.abs(d) < 1e-4) return to;
  return from + clamp(d * (1 - Math.exp(-22 * dt)), -dt * maxRate, dt * maxRate);
};

// The fixed wall + badge stage. The badge hangs in the hero, glides to the
// identity check, retracts upward, and lowers again (flipped) for contact.
export function Stage({ children, onSettled }) {
  const wallRef = useRef(null);
  const stageRef = useRef(null);
  const ropeRef = useRef(null);
  const dustRef = useRef(null);
  const leavesRef = useRef(null);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useLayoutEffect(() => {
    const wall = wallRef.current;
    const stage = stageRef.current;
    const ropeCanvas = ropeRef.current;
    const dustCanvas = dustRef.current;
    const hero = stage?.closest("[data-hero]");
    const slot = hero?.querySelector("[data-badge-slot]");
    if (!wall || !stage || !ropeCanvas || !dustCanvas || !hero || !slot) return;
    const rope = ropeCanvas.getContext("2d");
    const dustCtx = dustCanvas.getContext("2d");
    const leavesCanvas = leavesRef.current;
    const leavesCtx = leavesCanvas?.getContext("2d") ?? null;
    const q = (sel) => stage.querySelector(sel);
    const badge = q("[data-badge]");
    const shadowFar = q("[data-shadow-far]");
    const shadowNear = q("[data-shadow-near]");
    const ring = q("[data-ring]");
    const edge = q("[data-edge]");
    const sheen = q("[data-badge-sheen]");
    const pane = q("[data-badge-window]");
    const shade = q("[data-badge-shade]");
    const glintL = q("[data-badge-glint-left]");
    const glintR = q("[data-badge-glint-right]");
    const portrait = q("[data-badge-portrait]");
    const scene = wall.querySelector("[data-wall-scene]");
    const light = wall.querySelector("[data-wall-light]");
    if (!rope || !dustCtx || !badge || !scene || !light) return;

    const reduced = prefersReducedMotion();
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const sim = new Lanyard(lanyardParams(1, 200));
    const motes = new Motes();
    const branch = new Foliage(BRANCH);
    const workStage = document.querySelector("#work [data-stage]");

    const layout = {
      vw: 0, vh: 0, scale: 1, anchorX: 0, restHoleY: 0,
      markX: 0, markZoom: 1, markOrigin: "",
      closeX: 0, closeLift: 0, closeZoom: 1,
      travel: 0, retractDistance: 1, retractPower: 1.7,
      ropeLeft: 0, ropeWidth: 0, ropeHeight: 0, ropeRatio: 1, dustRatio: 1,
    };
    const state = {
      started: false, settled: false, asleep: false,
      intro: 1, scroll: 0, retract: 0,
      clock: 0, sinceStart: 0, warmup: 0, hiddenFor: 0,
      dust: 0, dustDrawn: false, dustDue: 0,
      kick: 1, shift: 0, lower: 0, turn: 0, turnSpeed: 0,
    };
    // Last values written to the DOM, to skip redundant style writes.
    const written = {
      shiftX: 0, camera: "", lit: 0, sun: 0, closing: false, back: false,
      edge: false, broad: 1, shade: "", glintLeft: "", glintRight: "",
    };
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, lastX: 0, lastTime: 0 };

    // How far the badge is pulled up out of view (0 = hanging, 1 = gone).
    const lift = () => {
      const up = reduced ? state.retract : 1 - (1 - state.intro) * (1 - state.retract);
      return up + (layout.closeLift - up) * state.lower;
    };
    const pivotY = (up) => -20 - up * layout.travel;
    const pivotX = () =>
      written.closing ? layout.closeX : layout.anchorX + (layout.markX - layout.anchorX) * state.shift;

    const drawBranch = () => {
      if (leavesCtx && !workStage?.hasAttribute("data-sealed")) branch.draw(leavesCtx, state.clock, direction.air);
    };

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Ignore mobile URL-bar height jitter.
      if (coarse && layout.vw === vw && Math.abs(layout.vh - vh) < 160) return;
      const box = slot.getBoundingClientRect();
      const top = box.top + window.scrollY;
      const wide = vw >= 1024;
      const hang = wide ? clamp(0.195 * vh, 120, 230) : clamp(0.2 * box.height, 64, 120);
      const height = Math.max(
        230,
        Math.min(wide ? clamp(0.545 * vh, 340, 600) : box.height - hang - 20, ((box.width - (wide ? 40 : 56)) * 478) / 300),
      );
      const scale = height / 478;
      const anchorX = box.left + box.width / 2;
      const restHoleY = top + hang + 18.5 * scale;
      if (
        layout.vw === vw && layout.vh === vh && Math.abs(layout.scale - scale) < 1e-4 &&
        Math.abs(layout.anchorX - anchorX) < 0.25 && Math.abs(layout.restHoleY - restHoleY) < 0.25
      ) return;

      const k = layout.vw === 0 ? 1 : scale / layout.scale;
      Object.assign(layout, { vw, vh, scale, anchorX, restHoleY });
      layout.travel = restHoleY + 459.5 * scale + 110;
      layout.retractPower = wide ? 1.7 : 1.05;
      layout.retractDistance = wide ? 0.62 * vh : Math.min(0.5 * vh, layout.travel / 1.35);
      sim.params = lanyardParams(scale, restHoleY + 20 - (5720 * scale) / 400);
      stage.style.setProperty("--u", `${scale}px`);

      // Identity-check mark: left third on desktop, centred on mobile.
      layout.markX = wide ? Math.max(0.3 * vw, 300 * scale * 0.5 + 64) : anchorX;
      layout.markZoom = wide ? 1.07 : 1;
      const markW = 300 * scale * layout.markZoom;
      const markH = 478 * scale * layout.markZoom;
      const markCY = restHoleY - 18.5 * scale + (478 * scale) / 2;
      layout.markOrigin = `${layout.markX}px ${markCY}px`;
      direction.frame = { x: layout.markX - markW / 2, y: markCY - markH / 2, width: markW, height: markH };

      // Contact: centred, zoomed so the card fills the upper part of the view.
      const headroom = clamp(0.075 * vh, 44, 84);
      const cardH = Math.min(0.62 * vh, vh - headroom - clamp(0.25 * vh, 150, 250), ((vw - 80) * 478) / 300, 700);
      const gap = Math.max(0, vh - headroom - cardH - clamp(0.34 * vh, 220, 400)) / 2;
      const restTop = restHoleY - 18.5 * scale;
      layout.closeX = vw / 2;
      layout.closeZoom = clamp(cardH / (478 * scale), 1, 1.9);
      layout.closeLift = clamp((restTop - (headroom + gap) / layout.closeZoom) / layout.travel, 0, 0.9);
      const closeW = 300 * scale * layout.closeZoom;
      direction.closing.frame = {
        x: layout.closeX - closeW / 2,
        y: (restTop - layout.closeLift * layout.travel) * layout.closeZoom,
        width: closeW,
        height: 478 * scale * layout.closeZoom,
      };
      direction.closing.floor = vh - gap;
      stage.style.transformOrigin = written.closing ? `${layout.closeX}px 0px` : layout.markOrigin;
      window.dispatchEvent(new Event(STAGE_LAYOUT));

      layout.ropeWidth = Math.min(vw, Math.max(360, 300 * scale * 1.9));
      layout.ropeLeft = clamp(anchorX - layout.ropeWidth / 2, 0, Math.max(0, vw - layout.ropeWidth));
      layout.ropeHeight = Math.min(vh, restHoleY + 110 * scale);
      layout.ropeRatio = Math.min(window.devicePixelRatio || 1, 2.5);
      Object.assign(ropeCanvas.style, {
        left: `${layout.ropeLeft}px`,
        width: `${layout.ropeWidth}px`,
        height: `${layout.ropeHeight}px`,
      });
      ropeCanvas.width = Math.round(layout.ropeWidth * layout.ropeRatio);
      ropeCanvas.height = Math.round(layout.ropeHeight * layout.ropeRatio);
      layout.dustRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      dustCanvas.width = Math.round(vw * layout.dustRatio);
      dustCanvas.height = Math.round(vh * layout.dustRatio);
      motes.scatter(vw, vh);
      if (leavesCanvas && branch.fit(leavesCanvas)) drawBranch();
      if (state.started) sim.rescale(pivotX(), pivotY(lift()), k);
    };

    // Writes the simulated pose to the DOM and redraws the rope.
    const render = () => {
      const u = layout.scale;
      const roll = sim.angle;
      const pitchDeg = sim.pitch / DEG;
      const left = sim.holeX - 150 * u;
      const top = sim.holeY - 18.5 * u;
      const yaw = sim.yaw + state.turn * Math.PI;
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);
      const back = cosY < 0;
      if (back !== written.back) {
        written.back = back;
        badge.dataset.side = back ? "back" : "front";
      }
      const faceYaw = Math.atan2(back ? -sinY : sinY, Math.abs(cosY));
      const faceDeg = faceYaw / DEG;
      badge.style.transform = `translate3d(${left}px, ${top}px, 0) perspective(${1150 * u}px) rotateZ(${roll}rad) rotateX(${sim.pitch}rad) rotateY(${yaw}rad)`;

      const sun = direction.closing.sun;
      const offX = (26 - 60 * sun + 1.3 * clamp(faceDeg, -24, 24) - 12 * pointer.x) * u;
      const offY = (34 + 16 * sun + 1.6 * pitchDeg - 8 * pointer.y) * u;
      const broad = Math.abs(cosY);
      const squash = 0.34 + 0.66 * broad;
      shadowFar.style.transform = `translate3d(${left + offX}px, ${top + offY}px, 0) rotate(${roll}rad) scaleX(${squash})`;
      shadowNear.style.transform = `translate3d(${left + 0.46 * offX}px, ${top + 0.46 * offY}px, 0) rotate(${roll}rad) scaleX(${squash})`;
      if (broad !== written.broad) {
        written.broad = broad;
        shadowFar.style.opacity = shadowNear.style.opacity = (0.3 + 0.7 * broad).toFixed(3);
      }
      ring.style.transform = `translate3d(${sim.holeX}px, ${sim.holeY}px, 0) rotate(${sim.ropeAngle}rad)`;

      // While the badge turns edge-on, show its thickness.
      const edgeOn = smoothstep(0.015, 0.09, state.turn) * smoothstep(0.015, 0.09, 1 - state.turn);
      if (edgeOn > 0.002) {
        const side = sinY >= 0 ? -150 : 150;
        const persp = 1150 / (1150 + side * sinY);
        const thick = 7 * Math.abs(sinY) * persp;
        const at = side * cosY * persp;
        const x = at + clamp(at / (thick / 2 + 1e-6), -1, 1) * Math.max(0, thick / 2 - 0.9);
        edge.style.transform = `translate3d(${sim.holeX}px, ${sim.holeY}px, 0) rotate(${roll}rad) translate3d(${(x - thick / 2) * u}px, ${-9.5 * persp * u}px, 0) scale(${thick / 7}, ${persp})`;
        edge.style.opacity = edgeOn.toFixed(3);
        written.edge = true;
      } else if (written.edge) {
        written.edge = false;
        edge.style.opacity = "0";
      }

      // Specular sheen slides across the laminate as the badge moves.
      const lit = direction.light;
      const glide =
        clamp(-(10 * faceDeg) - (roll / DEG) * 4 + 3 * pitchDeg + (lit * (direction.scan - 0.5) * 320 + 58 * sun), -230, 230) * u;
      const sheenX = back ? -glide : glide;
      sheen.style.transform = `translate3d(${sheenX}px, 0, 0)`;
      pane.style.transform = `translate3d(${-(0.32 * sheenX)}px, ${-(2.2 * pitchDeg) * u}px, 0) skewX(-14deg)`;
      const shadeOp = clamp(0.03 - 1.05 * ((0.9 * sun - 0.45) * Math.sin(faceYaw) + 0.55 * Math.sin(sim.pitch)), 0, 0.17).toFixed(3);
      if (shadeOp !== written.shade) {
        written.shade = shadeOp;
        shade.style.opacity = shadeOp;
      }
      const gl = clamp(faceDeg / 7 + 0.45 * lit + 0.2 * sun, 0, 1).toFixed(2);
      const gr = clamp(-faceDeg / 9 + 0.3 * lit + 0.26 * sun, 0, 0.8).toFixed(2);
      const left2 = back ? gr : gl;
      const right2 = back ? gl : gr;
      if (left2 !== written.glintLeft) {
        written.glintLeft = left2;
        glintL.style.opacity = left2;
      }
      if (right2 !== written.glintRight) {
        written.glintRight = right2;
        glintR.style.opacity = right2;
      }

      // "Camera": a gentle push-in during identity check, a breathing zoom at contact.
      const shiftX = sim.pivotX - layout.anchorX;
      let camera = "";
      if (written.closing) {
        const z = direction.closing.zoom;
        if (z > 5e-4) {
          const breathe = reduced ? 0 : z;
          const s = (1 + (layout.closeZoom - 1) * z) * (1 + 0.003 * breathe * Math.sin(0.47 * state.clock));
          const bx = 2.4 * breathe * Math.sin(0.21 * state.clock + 1.3);
          const by = 1.8 * breathe * Math.sin(0.29 * state.clock);
          camera = `translate3d(${bx.toFixed(2)}px, ${by.toFixed(2)}px, 0) scale(${s.toFixed(5)})`;
        }
      } else {
        const s = 1 + (layout.markZoom - 1) * direction.zoom;
        if (s > 1.0004) camera = `scale(${s.toFixed(4)})`;
      }
      if (camera !== written.camera) {
        written.camera = camera;
        stage.style.transform = camera;
      }
      if (lit !== written.lit) {
        written.lit = lit;
        stage.style.setProperty("--lit", lit.toFixed(3));
      }
      if (sun !== written.sun) {
        written.sun = sun;
        stage.style.setProperty("--sun", sun.toFixed(3));
      }
      if (shiftX !== written.shiftX) {
        written.shiftX = shiftX;
        ropeCanvas.style.transform = shiftX ? `translate3d(${shiftX}px, 0, 0)` : "";
      }
      const originX = layout.ropeLeft + shiftX;
      rope.setTransform(layout.ropeRatio, 0, 0, layout.ropeRatio, -originX * layout.ropeRatio, 0);
      rope.clearRect(originX, 0, layout.ropeWidth, layout.ropeHeight);
      drawRope(rope, {
        pivotX: sim.pivotX, pivotY: sim.pivotY, holeX: sim.holeX, holeY: sim.holeY,
        bend1: sim.bend1, bend2: sim.bend2, slack: sim.slack, scale: u,
        shadowX: 0.9 * offX, shadowY: 0.9 * offY,
      });
      light.style.transform = `translate3d(${-(10 * pointer.x)}px, ${-(6 * pointer.y)}px, 0)`;
    };

    const rehang = (x, y) => {
      if (reduced) sim.reset(x, y);
      else if (written.closing) {
        sim.reset(x, y, CLOSING_TILT * state.kick);
        sim.setPose(0.28 * state.kick, 0.12);
      } else sim.reset(x, y, 0.06 * state.kick);
    };

    let settleTimer = 0;
    const settle = () => {
      if (state.settled) return;
      window.clearTimeout(settleTimer);
      state.settled = true;
      wall.dataset.lit = "true";
      gsap.to(state, { dust: 1, duration: reduced ? 0.01 : 3, delay: reduced ? 0 : 0.6, ease: "power1.out" });
      settledRef.current?.();
    };

    const drop = () => {
      // Fall in from above with enough speed to arrive in ~1.15s, tilted.
      const speed = ((3 * 0.58 + 0.42) * layout.travel) / 1.15;
      state.sinceStart = 0;
      state.intro = 1;
      sim.reset(pivotX(), pivotY(1), DROP_TILT, 0, speed);
      sim.setPose(-0.34, 0.12);
      render();
      stage.style.opacity = "";
    };

    const tick = (_time, deltaMs) => {
      if (!state.started) return;
      if (state.warmup > 0) {
        state.warmup -= 1;
        if (state.warmup === 0) drop();
        return;
      }
      const dt = Math.min(deltaMs / 1000, 0.05);
      state.clock += dt;
      state.sinceStart += dt;
      direction.air =
        (Math.sin(0.37 * state.clock) + Math.sin(0.61 * state.clock + 1.7) + Math.sin(0.23 * state.clock + 4.1)) / 3;
      if (!reduced) {
        const t = Math.min(1, state.sinceStart / 1.15);
        state.intro = Math.max(0, 1 - (0.58 * (1 - (1 - t) ** 3) + 0.42 * t));
      }
      const target = state.scroll ** layout.retractPower;
      if (reduced) state.retract = target;
      else {
        const d = (target - state.retract) * (1 - Math.exp(-16 * dt));
        state.retract += clamp(d, -3.2 * dt, 3.2 * dt);
      }
      const closing = direction.closing;
      if (reduced) {
        state.shift = direction.shift;
        state.lower = closing.lower;
        state.turn = closing.turn;
      } else {
        state.shift = follow(state.shift, direction.shift, dt, 1.25);
        state.lower = follow(state.lower, closing.lower, dt, 1.5);
        // Spring the flip so it overshoots a touch, like a real card.
        const accel = 49 * (closing.turn - state.turn) - 14 * state.turnSpeed;
        state.turnSpeed = clamp(state.turnSpeed + accel * dt, -1.6, 1.6);
        state.turn = clamp(state.turn + state.turnSpeed * dt, 0, 1);
        if (Math.abs(closing.turn - state.turn) < 1e-4 && Math.abs(state.turnSpeed) < 0.001) {
          state.turn = closing.turn;
          state.turnSpeed = 0;
        }
      }
      const isClosing = state.lower > 0;
      if (isClosing !== written.closing) {
        written.closing = isClosing;
        stage.style.transformOrigin = isClosing ? `${layout.closeX}px 0px` : layout.markOrigin;
        if (!state.asleep) rehang(pivotX(), pivotY(lift()));
      }
      const up = lift();
      const px = pivotX();
      const py = pivotY(up);

      // Sleep while the badge is fully retracted.
      if (state.settled && up > 0.995) {
        state.hiddenFor += dt;
        if (state.hiddenFor > 0.6) {
          if (!state.asleep) {
            state.asleep = true;
            direction.placed = false;
            rope.setTransform(1, 0, 0, 1, 0, 0);
            rope.clearRect(0, 0, ropeCanvas.width, ropeCanvas.height);
            dustCtx.setTransform(1, 0, 0, 1, 0, 0);
            dustCtx.clearRect(0, 0, dustCanvas.width, dustCanvas.height);
            state.dustDrawn = false;
          }
          if (!reduced) drawBranch();
          return;
        }
      } else {
        state.hiddenFor = 0;
        if (state.asleep) {
          state.asleep = false;
          rehang(px, py);
        }
      }

      const ease = 1 - Math.exp(-7 * dt);
      pointer.x += (pointer.targetX - pointer.x) * ease;
      pointer.y += (pointer.targetY - pointer.y) * ease;
      if (reduced) sim.reset(px, py);
      else {
        if (direction.push) {
          sim.push(direction.push * layout.scale);
          direction.push = 0;
        }
        sim.params.cardDrag = 0.85 + 4.4 * Math.max(direction.steady, closing.steady);
        sim.step(dt, {
          pivotX: px,
          pivotY: py,
          wind: (26 * direction.air + 85 * pointer.x) * layout.scale,
          bow: 5 * pointer.x * layout.scale,
          yaw: pointer.x * POINTER_YAW,
          pitch: -pointer.y * POINTER_PITCH,
        });
      }
      if (!state.settled && state.sinceStart > 0.8 && (sim.amplitude < SETTLED || state.sinceStart > 1.4)) settle();
      direction.placed =
        !written.closing &&
        direction.shift > 0.999 &&
        Math.abs(sim.pivotX - layout.markX) < 0.5 &&
        Math.abs(sim.holeX - layout.markX) < 300 * layout.scale * PLACED.off &&
        sim.amplitude < PLACED.swing;
      render();

      const dust =
        state.dust *
        Math.max((1 - smoothstep(0.1, 0.85, state.scroll)) * (1 + 1.3 * direction.light), state.lower * (0.5 + 0.9 * closing.sun));
      if (dust > 0.004 || state.dustDrawn) {
        state.dustDue += dt;
        if (state.dustDue >= 0.0323) {
          dustCtx.setTransform(layout.dustRatio, 0, 0, layout.dustRatio, 0, 0);
          dustCtx.clearRect(0, 0, layout.vw, layout.vh);
          state.dustDrawn = dust > 0.004;
          if (state.dustDrawn) motes.draw(dustCtx, state.clock, state.dustDue, dust, -(16 * pointer.x), -(10 * pointer.y));
          state.dustDue = 0;
        }
      }
      if (!reduced && !written.closing) drawBranch();
    };

    const start = () => {
      if (state.started) return;
      state.started = true;
      stage.dataset.ready = "true";
      if (reduced) {
        state.intro = 0;
        sim.reset(pivotX(), pivotY(lift()));
        render();
        settle();
        return;
      }
      stage.style.opacity = "0.01";
      sim.reset(pivotX(), pivotY(0));
      render();
      state.warmup = 4; // let the browser rasterise layers before the drop
      settleTimer = window.setTimeout(settle, 2200);
    };

    let disposed = false;
    const ctx = gsap.context(() => {
      measure();
      // Retract the badge upward once the identity check has finished.
      const retract = ScrollTrigger.create({
        trigger: hero,
        start: () => ScrollTrigger.getById("identity")?.end ?? "top top",
        end: () => `+=${layout.retractDistance}`,
        refreshPriority: -1,
        onUpdate: (self) => {
          state.scroll = self.progress;
        },
      });
      state.scroll = retract.progress;
      // A nudge as soon as the visitor starts scrolling.
      let progress = 0;
      ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => {
          const before = progress;
          progress = self.progress;
          if (!reduced && state.settled && before <= 0.012 && progress > 0.012) {
            sim.push(205 * layout.scale * state.kick);
            sim.spin(1.1 * state.kick, 0.6);
            state.kick = -state.kick;
          }
        },
      });
      gsap.to(scene, {
        opacity: 0.45,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      });
    });

    const portraitReady =
      portrait && portrait.tagName === "IMG" && !(portrait.complete && portrait.naturalWidth > 0)
        ? new Promise((resolve) => {
            portrait.addEventListener("load", resolve, { once: true });
            portrait.addEventListener("error", resolve, { once: true });
          })
        : Promise.resolve();
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 1600));
    Promise.all([Promise.race([Promise.all([portraitReady, document.fonts.ready]), timeout]), whenLifted()]).then(() =>
      requestAnimationFrame(() => {
        if (!disposed) start();
      }),
    );

    const onPointer = (e) => {
      if (reduced || e.pointerType === "touch") return;
      pointer.targetX = clamp((e.clientX - pivotX()) / (0.5 * layout.vw), -1, 1);
      pointer.targetY = clamp((e.clientY - 0.5 * layout.vh) / (0.5 * layout.vh), -1, 1);
      const now = performance.now();
      const dt = (now - pointer.lastTime) / 1000;
      if (state.settled && dt > 0 && dt < 0.08) {
        // Sweeping the cursor past the badge flicks it.
        const speed = clamp((e.clientX - pointer.lastX) / dt, -2400, 2400);
        const w = 300 * layout.scale;
        const near =
          (1 - smoothstep(0.5 * w, 1.6 * w, Math.hypot(e.clientX - sim.cardX, e.clientY - sim.cardY))) *
          (written.closing ? 0.25 : 1);
        if (near > 0) {
          sim.push(speed * dt * 0.16 * near);
          sim.pluck(speed * dt * 0.5 * near);
        }
      }
      pointer.lastX = e.clientX;
      pointer.lastTime = now;
    };
    const onLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };
    const resizer = new ResizeObserver(measure);
    resizer.observe(slot);
    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    gsap.ticker.add(tick);

    return () => {
      disposed = true;
      ctx.revert();
      resizer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      gsap.ticker.remove(tick);
      window.clearTimeout(settleTimer);
      stage.style.opacity = "";
      stage.style.transform = "";
      delete badge.dataset.side;
      delete stage.dataset.ready;
      delete wall.dataset.lit;
    };
  }, []);

  return (
    <>
      <div ref={wallRef} className="wall" aria-hidden="true">
        <div className="wall__scene" data-wall-scene="">
          <div className="wall__wash" />
          <div className="wall__light" data-wall-light="">
            <div className="wall__beam">
              <div className="wall__pane" />
              <div className="wall__pane" />
              <div className="wall__pane" />
              <div className="wall__pane" />
            </div>
            <canvas ref={leavesRef} className="wall__leaves" />
          </div>
        </div>
        <div className="wall__grain" />
      </div>
      <div ref={stageRef} className="stage">
        <div className="stage__shadow stage__shadow--far" data-shadow-far="" />
        <div className="stage__shadow stage__shadow--near" data-shadow-near="" />
        <canvas ref={ropeRef} className="stage__rope" aria-hidden="true" />
        <div className="stage__edge" data-edge="" />
        {children}
        <svg className="stage__ring" data-ring="" viewBox="-8 -29 16 34" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="ring-steel" gradientUnits="userSpaceOnUse" x1="-6" y1="-26" x2="6" y2="3">
              {STEEL.map(([at, color]) => (
                <stop key={at} offset={at} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          <path d="M0 -26A5.2 14.5 0 0 0 0 3" stroke="rgb(52 44 34 / 0.5)" strokeWidth="3.2" />
          <path d="M0 -26A5.2 14.5 0 0 0 0 3" stroke="url(#ring-steel)" strokeWidth="2.3" />
        </svg>
        <canvas ref={dustRef} className="stage__dust" aria-hidden="true" />
      </div>
    </>
  );
}
