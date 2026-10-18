import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, GLIDE, registerGlide, remeasure, scrollFor, anticipatePin, prefersReducedMotion } from "../lib/motion";
import { pageScroll } from "../lib/pageScroll";
import { projects } from "../data/site";
import { Arrow } from "./Hero";

const COUNT = projects.length;
const STEP = (2 * Math.PI) / COUNT; // angle between neighbouring cards
const TURN = 1.7; // timeline seconds per card
const LENGTH = 1 + (COUNT - 1) * TURN + 0.3;
const SHRINK = 1.64 - 1; // back cards scale to 64%
const FADE_POW = Math.log(0.62) / Math.log(0.46808510638297873);
const SHADOW_POW = Math.log(0.24) / Math.log(0.5);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const clamp11 = (v) => Math.max(-1, Math.min(1, v));
const wrap = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
const slug = (name) => `work-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

// Seeded dust drifting through the room.
function makeRoomDust() {
  let seed = 9;
  const rand = () => (seed = (16807 * seed) % 0x7fffffff) / 0x7fffffff;
  const motes = Array.from({ length: 28 }, () => ({
    x: rand(), y: rand(), depth: 0.3 + 0.7 * rand(), size: 0.8 + 1.6 * rand(),
    drift: (rand() - 0.5) * 0.012, rise: 0.006 + 0.014 * rand(), phase: rand() * Math.PI * 2,
  }));
  return (ctx, w, h, time, dt, shift) => {
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      m.x = (m.x + m.drift * dt + 1) % 1;
      m.y = (m.y - m.rise * dt + 1) % 1;
      const x = (((m.x * w + shift * m.depth + 10 * Math.sin(0.3 * time + m.phase)) % w) + w) % w;
      ctx.fillStyle = `rgba(128, 124, 118, ${(0.1 + 0.2 * m.depth) * (0.7 + 0.3 * Math.sin(0.8 * time + m.phase))})`;
      ctx.beginPath();
      ctx.arc(x, m.y * h, m.size * (0.6 + 0.7 * m.depth), 0, 2 * Math.PI);
      ctx.fill();
    }
  };
}

export function Work() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const section = ref.current;
    const stage = section?.querySelector("[data-stage]");
    const orbit = section?.querySelector("[data-orbit]");
    const ringEl = section?.querySelector("[data-ring]");
    const dustCanvas = section?.querySelector("[data-room-dust]");
    if (!section || !stage || !orbit || !ringEl || !dustCanvas) return;
    const reduced = prefersReducedMotion();
    const cleanups = [];
    const cards = [...section.querySelectorAll("[data-card]")].map((slot) => ({
      slot,
      tilt: slot.querySelector("[data-tilt]"),
      layers: [...slot.querySelectorAll("[data-layer]")],
      face: slot.querySelector("[data-face]"),
      shadow: slot.querySelector("[data-shadow]"),
      shadowShift: slot.querySelector("[data-shadow-shift]"),
      track: slot.querySelector("[data-gloss-track]"),
      gloss: slot.querySelector("[data-gloss]"),
      spot: slot.querySelector("[data-spot]"),
      copy: slot.querySelector("[data-copy]"),
      mark: slot.querySelector("[data-mark]"),
      written: { shown: true, transform: "", opacity: "", filter: "", shadow: "", stack: "" },
    }));
    if (!cards.length) return;

    // Size each etched mark so it spans the card width.
    let stopped = false;
    const fitMarks = () => {
      if (stopped) return;
      for (const card of cards) {
        const word = card.mark?.firstElementChild;
        const holder = card.mark?.parentElement;
        const fw = card.face.offsetWidth;
        const fh = card.face.offsetHeight;
        if (!word || !holder || !fw || !fh) continue;
        word.style.fontSize = "100px";
        word.style.letterSpacing = "0px";
        const w = word.offsetWidth;
        word.style.fontSize = "";
        word.style.letterSpacing = "";
        if (!w) continue;
        const full = 9120 / w;
        const script = card.mark.dataset.cut === "devanagari";
        const size = script ? full : Math.min(full, ((0.6 * fh) / fw) * 100);
        const letters = [...(word.textContent ?? "")].length;
        const track = !script && letters > 1 ? (91.2 - (w / 100) * size) / size / (letters - 1) : 0;
        holder.style.setProperty("--fit", `${size.toFixed(3)}cqw`);
        holder.style.setProperty("--track", `${track.toFixed(4)}em`);
      }
    };
    fitMarks();
    document.fonts.ready.then(fitMarks);
    ScrollTrigger.addEventListener("refresh", fitMarks);
    cleanups.push(() => {
      stopped = true;
      ScrollTrigger.removeEventListener("refresh", fitMarks);
    });

    const room = { live: false, shift: 0, width: 0, height: 0, ratio: 1, clock: 0, due: 0 };
    const dustCtx = dustCanvas.getContext("2d");
    const drawDust = makeRoomDust();
    if (!reduced) {
      const tick = (_t, deltaMs) => {
        if (!room.live || !dustCtx || !room.width) return;
        const dt = Math.min(deltaMs / 1000, 0.05);
        room.clock += dt;
        room.due += dt;
        if (room.due < 0.0323) return;
        dustCtx.setTransform(room.ratio, 0, 0, room.ratio, 0, 0);
        drawDust(dustCtx, room.width, room.height, room.clock, room.due, room.shift);
        room.due = 0;
      };
      gsap.ticker.add(tick);
      cleanups.push(() => gsap.ticker.remove(tick));
    }

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference) and (min-height: 560px)", () => {
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const hint = section.querySelector("[data-hint]");
      const minis = gsap.utils.toArray("[data-mini]", section);
      const lights = gsap.utils.toArray("[data-room-light]", section);
      const roomEl = section.querySelector(".work__room");
      section.dataset.presenting = "true";
      ScrollTrigger.config({ ignoreMobileResize: true });
      registerGlide();

      const radius = { x: 0, y: 0, z: 0 };
      // A data-attribute flag that stays on for a while after the last hold().
      const flag = (attr) => {
        let until = 0;
        let timer = 0;
        const off = () => {
          until = 0;
          section.removeAttribute(attr);
        };
        return {
          hold(ms) {
            const end = performance.now() + ms;
            if (end <= until) return;
            const first = !until;
            until = end;
            window.clearTimeout(timer);
            timer = window.setTimeout(off, ms);
            if (first) section.setAttribute(attr, "");
          },
          clear() {
            window.clearTimeout(timer);
            until = 0;
            section.removeAttribute(attr);
          },
        };
      };
      const turning = flag("data-turning");
      const tilting = flag("data-tilting");
      let active = -1;
      let hovered = false;
      const spin = { at: -0.28 };
      const intro = { done: 0 };

      // Idle "breathing" of the front card.
      const idle = { ease: "sine.inOut", repeat: -1, yoyo: true, paused: true };
      const breaths = cards.map((c, i) => [
        gsap.fromTo(c.tilt, { y: 2.5 }, { y: -2.5, duration: 6.2 + 0.35 * i, ...idle }),
        gsap.fromTo(c.shadowShift, { opacity: 1, scale: 1 }, { opacity: 0.84, scale: 1.025, duration: 6.2 + 0.35 * i, ...idle }),
        gsap.fromTo(c.gloss, { xPercent: -5 }, { xPercent: 6, duration: 10.5 + 0.6 * i, ...idle }),
      ]);
      const breathe = () =>
        breaths.forEach((tweens, i) => {
          const on = room.live && i === active;
          for (const t of tweens) on ? t.play() : t.pause();
        });

      const to = (el, prop, d) => gsap.quickTo(el, prop, { duration: d, ease: "power3.out" });
      const hover = cards.map((c) => ({
        tiltX: to(c.tilt, "rotationX", 0.9),
        tiltY: to(c.tilt, "rotationY", 0.9),
        shadowX: to(c.shadowShift, "x", 1.1),
        shadowY: to(c.shadowShift, "y", 1.1),
        glossX: to(c.track, "x", 1),
        spotX: to(c.spot, "x", 0.55),
        spotY: to(c.spot, "y", 0.55),
        spotOpacity: to(c.spot, "opacity", 0.7),
        copyX: to(c.copy, "x", 1),
        copyY: to(c.copy, "y", 1),
        markX: to(c.mark, "x", 1.2),
        markY: to(c.mark, "y", 1.2),
      }));
      const glossAt = cards.map((c) => gsap.quickSetter(c.track, "xPercent"));
      const rest = (i) => {
        const h = hover[i];
        for (const f of [h.tiltX, h.tiltY, h.shadowX, h.shadowY, h.glossX, h.copyX, h.copyY, h.markX, h.markY]) f(0);
        h.spotOpacity(0);
      };

      const veil = section.querySelector("[data-veil]");
      const floor = section.querySelector("[data-floor]");
      const rims = floor ? [...floor.querySelectorAll("[data-floor-rim]")] : [];
      const ticks = floor ? [...floor.querySelectorAll("[data-floor-ticks]")] : [];
      const stations = floor ? [...floor.querySelectorAll("[data-floor-station]")] : [];
      const lens = { cx: 0, cy: 0, lens: 1, below: 0 };
      // Projects a point on the floor ellipse (fraction r of the radius, angle a).
      const project = (r, a) => {
        const x = radius.x * r * Math.sin(a);
        const y = lens.below - radius.y + radius.y * r * Math.cos(a);
        const z = -radius.z + radius.z * r * Math.cos(a);
        const k = lens.lens / (lens.lens - z);
        return { x: lens.cx + x * k, y: lens.cy + y * k, seen: k };
      };
      const pt = ({ x, y }) => `${x.toFixed(1)} ${y.toFixed(1)}`;
      const flags = { veil: "", sealed: false };
      const cache = new WeakMap();
      const set = (el, prop, value) => {
        const c = cache.get(el) ?? {};
        if (c[prop] === value) return;
        c[prop] = value;
        cache.set(el, c);
        el.style[prop] = value;
      };
      const facing = cards.map(() => 0);
      const order = cards.map((_, i) => i);

      const update = () => {
        const at = spin.at;
        const done = intro.done;
        const time = tl.time();
        const veilOp = clamp01((time - 1) / 0.25).toFixed(3);
        if (veilOp !== flags.veil) {
          flags.veil = veilOp;
          if (veil) veil.style.opacity = veilOp;
        }
        const sealed = time >= 1.2495 && time < LENGTH - 5e-4;
        if (sealed !== flags.sealed) {
          flags.sealed = sealed;
          stage.toggleAttribute("data-sealed", sealed);
        }
        lights.forEach((l, i) => set(l, "opacity", (done * clamp01(1 - Math.abs(at - i))).toFixed(3)));
        room.shift = -(70 * at);

        let moved = false;
        cards.forEach((card, i) => {
          const angle = wrap((i - at) * STEP);
          const cos = Math.cos(angle);
          const front = (1 + cos) / 2;
          facing[i] = front;
          const alpha = done * Math.max(0, (front - 0.06) / 0.94) ** FADE_POW;
          const { written } = card;
          // Cards out of view are made transparent rather than visibility:hidden,
          // so their links stay reachable by keyboard (focus turns the ring).
          const shown = alpha > 0.004;
          written.shown = shown;
          if (!shown) {
            if (written.opacity !== "0") {
              written.opacity = "0";
              for (const layer of card.layers) layer.style.opacity = "0";
            }
            if (written.shadow !== "0") {
              written.shadow = "0";
              card.shadow.style.opacity = "0";
            }
            return;
          }
          const s = (SHRINK + (1 - SHRINK) * front).toFixed(4);
          const transform = `translate3d(${(radius.x * Math.sin(angle)).toFixed(2)}px, ${(-radius.y * (1 - cos)).toFixed(2)}px, ${(-radius.z * (1 - cos) - (1 - done) * 520).toFixed(2)}px) rotateY(${(16 * Math.sin(angle)).toFixed(3)}deg) scale3d(${s}, ${s}, ${s})`;
          if (transform !== written.transform) {
            written.transform = transform;
            card.slot.style.transform = transform;
            moved = true;
          }
          const op = alpha > 0.999 ? "" : alpha.toFixed(3);
          if (op !== written.opacity) {
            written.opacity = op;
            for (const layer of card.layers) layer.style.opacity = op;
          }
          // Depth of field: cards further round the ring go soft.
          const blur = 0.5 * Math.round(Math.min(4, 1.9 * ((1 - front) / 0.5) ** 1.4 + (1 - done) * 6) / 0.5);
          const filter = blur === 0 ? "" : `blur(${blur}px)`;
          if (filter !== written.filter) {
            written.filter = filter;
            card.face.style.filter = filter;
          }
          const sh = (done * front ** SHADOW_POW).toFixed(3);
          if (sh !== written.shadow) {
            written.shadow = sh;
            card.shadow.style.opacity = sh;
          }
          glossAt[i]((-(180 * angle) / Math.PI) * 0.28);
        });

        if (moved) {
          turning.hold(180);
          if (floor) {
            let near = "";
            let far = "";
            for (let i = 0; i < 72; i++) {
              const a = wrap((i / 72) * Math.PI * 2 - at * STEP);
              const p0 = project(i % 9 === 0 ? 0.91 : 0.942, a);
              const p1 = project(0.992, a);
              const d = `M${pt(p0)}L${pt(p1)}`;
              if (Math.cos(a) > 0) near += d;
              else far += d;
            }
            ticks[0]?.setAttribute("d", near);
            ticks[1]?.setAttribute("d", far);
            stations.forEach((dot, i) => {
              const a = wrap((i - at) * STEP);
              const p = project((1 + 0.93) / 2, a);
              dot.setAttribute("cx", p.x.toFixed(1));
              dot.setAttribute("cy", p.y.toFixed(1));
              dot.setAttribute("r", (3.4 * p.seen).toFixed(2));
              dot.toggleAttribute("data-front", Math.cos(a) > Math.cos(STEP / 2));
            });
          }
        }
        if (floor) set(floor, "opacity", done.toFixed(3));
        order.sort((a, b) => facing[a] - facing[b]);
        order.forEach((ci, z) => {
          const v = String(z + 1);
          if (cards[ci].written.stack !== v) {
            cards[ci].written.stack = v;
            cards[ci].slot.style.zIndex = v;
          }
        });
        minis.forEach((dot, i) => {
          const a = wrap((i - at) * STEP);
          const f = (1 + Math.cos(a)) / 2;
          set(dot, "transform", `translate(${(15 * Math.sin(a)).toFixed(2)}px, ${(4.5 * Math.cos(a)).toFixed(2)}px) scale(${(0.55 + 0.45 * f).toFixed(3)})`);
          set(dot, "opacity", (0.2 + 0.8 * f ** 3).toFixed(3));
        });
        if (hint) set(hint, "opacity", (done * clamp01(1 - at / 0.35)).toFixed(3));

        const nearest = gsap.utils.clamp(0, COUNT - 1, Math.round(at));
        if (nearest !== active) {
          if (active >= 0 && hovered) rest(active);
          hovered = false;
          active = nearest;
          stage.dataset.active = String(nearest);
          cards.forEach((c, i) => {
            c.slot.toggleAttribute("data-active", i === nearest);
            c.slot.toggleAttribute("data-near", Math.abs(i - nearest) === 1);
          });
          breathe();
        } else if (hovered && Math.abs(at - active) > 0.2) {
          rest(active);
          hovered = false;
        }
      };

      const tl = gsap.timeline({ paused: true, defaults: { ease: GLIDE, immediateRender: false }, onUpdate: update });
      tl.fromTo(intro, { done: 0 }, { done: 1, duration: 1, ease: "sine.out" }, 0).fromTo(
        spin,
        { at: -0.28 },
        { at: 0, duration: 1, ease: "sine.out" },
        0,
      );
      for (let i = 1; i < COUNT; i++) tl.fromTo(spin, { at: i - 1 }, { at: i, duration: TURN }, 1 + (i - 1) * TURN);
      tl.to({}, { duration: LENGTH, ease: "none" }, 0);

      const layout = () => {
        const w = orbit.clientWidth;
        const h = orbit.clientHeight;
        const share = 0.56 + 0.22 * clamp01((1280 - w) / 640);
        const wideW = Math.min(w * share, 0.9 * h * 1.58, 1160);
        const wide = w >= 720 && wideW >= 560;
        const cardW = wide ? wideW : Math.min(0.84 * w, 440);
        const cardH = wide ? cardW / 1.58 : Math.min(0.92 * h, 1.62 * cardW);
        stage.dataset.shape = wide ? "wide" : "tall";
        stage.style.setProperty("--card-w", `${Math.round(cardW)}px`);
        stage.style.setProperty("--card-h", `${Math.round(cardH)}px`);
        fitMarks();
        radius.x = cardW * Math.max(0.7, 0.49 / Math.sin(STEP / 2));
        radius.z = 0.42 * cardW;
        radius.y = 0.07 * cardH;
        ringEl.style.transform = `perspective(${Math.round(2.3 * cardW)}px)`;
        lens.cx = w / 2;
        lens.cy = h / 2;
        lens.lens = Math.round(2.3 * cardW);
        lens.below = 0.62 * cardH;
        rims.forEach((rim, i) => {
          const r = i === 0 ? 1 : 0.93;
          let d = "";
          for (let s = 0; s <= 120; s++) d += `${s ? "L" : "M"}${pt(project(r, (s / 120) * Math.PI * 2))}`;
          rim.setAttribute("d", `${d}Z`);
        });
        room.width = stage.clientWidth;
        room.height = stage.clientHeight;
        room.ratio = Math.min(window.devicePixelRatio || 1, 1.25) / 2;
        dustCanvas.width = Math.round(room.width * room.ratio);
        dustCanvas.height = Math.round(room.height * room.ratio);
        for (const c of cards) c.written.transform = "";
        update();
      };
      layout();
      remeasure();

      const pin = ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        end: () => `+=${scrollFor(LENGTH - 1)}`,
        pin: true,
        anticipatePin: anticipatePin(),
      });
      // The intro (cards flying in) plays while the stage scrolls into view.
      const sync = () => {
        if (roomEl?.style.visibility) roomEl.style.visibility = "";
        const y = window.scrollY;
        const t =
          y < pin.start
            ? clamp01(1 - (pin.start - y) / (0.9 * window.innerHeight))
            : Math.min(LENGTH, 1 + (y - pin.start) / scrollFor(1));
        if (tl.time() !== t) tl.time(t);
      };
      ScrollTrigger.create({
        trigger: stage,
        start: () => `top ${Math.round(0.9 * window.innerHeight)}px`,
        end: () => pin.end,
        onUpdate: sync,
      });
      const live = new IntersectionObserver(([entry]) => {
        room.live = entry.isIntersecting;
        breathe();
      });
      live.observe(stage);
      const nearView = new IntersectionObserver(
        ([entry]) => {
          if (roomEl) roomEl.style.visibility = entry.isIntersecting ? "" : "hidden";
        },
        { rootMargin: "100% 0px" },
      );
      nearView.observe(stage);
      const onRefresh = () => {
        layout();
        sync();
      };
      ScrollTrigger.addEventListener("refresh", onRefresh);

      // Clicking (or tabbing into) a neighbouring card turns the ring to it.
      const goTo = (i, always = false) => {
        const y = Math.round(pin.start + TURN * i * scrollFor(1));
        if (i !== active || (always && Math.abs(window.scrollY - y) > 4)) pageScroll.glide(y);
      };
      const unbind = cards.map((c, i) => {
        const onClick = (e) => {
          if (c.slot.hasAttribute("data-near")) {
            e.preventDefault();
            goTo(i);
          }
        };
        const onFocus = () => goTo(i, true);
        c.slot.addEventListener("click", onClick);
        c.slot.addEventListener("focusin", onFocus);
        return () => {
          c.slot.removeEventListener("click", onClick);
          c.slot.removeEventListener("focusin", onFocus);
        };
      });

      // Pointer tilt, gloss and spotlight on the front card.
      const onMove = (e) => {
        if (active < 0 || e.pointerType === "touch" || Math.abs(spin.at - active) > 0.2) return;
        const card = cards[active];
        const h = hover[active];
        const r = card.face.getBoundingClientRect();
        const nx = clamp11(((e.clientX - r.left) / r.width) * 2 - 1);
        const ny = clamp11(((e.clientY - r.top) / r.height) * 2 - 1);
        h.tiltX(-(3 * ny));
        h.tiltY(3 * nx);
        h.shadowX(-(16 * nx));
        h.shadowY(-(0.6 * (16 * ny)));
        h.glossX(46 * nx);
        h.copyX(4 * nx);
        h.copyY(4 * ny * 0.8);
        h.markX(-(7 * nx));
        h.markY(-(0.6 * (7 * ny)));
        h.spotX(e.clientX - r.left);
        h.spotY(e.clientY - r.top);
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        h.spotOpacity(inside ? 1 : 0);
        hovered = true;
        tilting.hold(1100);
      };
      const onLeave = () => {
        if (active >= 0) rest(active);
        hovered = false;
      };
      if (fine) {
        stage.addEventListener("pointermove", onMove);
        stage.addEventListener("pointerleave", onLeave);
      }

      return () => {
        turning.clear();
        tilting.clear();
        live.disconnect();
        nearView.disconnect();
        room.live = false;
        ScrollTrigger.removeEventListener("refresh", onRefresh);
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerleave", onLeave);
        unbind.forEach((f) => f());
        for (const c of cards) {
          for (const el of [c.slot, c.shadow, ...c.layers]) el.removeAttribute("style");
          c.slot.removeAttribute("data-active");
          c.slot.removeAttribute("data-near");
        }
        const moved = cards.flatMap((c) => [c.tilt, c.shadowShift, c.track, c.gloss, c.spot, c.copy, c.mark]);
        gsap.killTweensOf(moved);
        gsap.set(moved, { clearProps: "all" });
        for (const el of [...lights, ...minis, ringEl]) el.removeAttribute("style");
        hint?.removeAttribute("style");
        veil?.removeAttribute("style");
        floor?.removeAttribute("style");
        stage.removeAttribute("data-sealed");
        if (roomEl) roomEl.style.visibility = "";
        stage.removeAttribute("style");
        delete stage.dataset.shape;
        delete stage.dataset.active;
        delete section.dataset.presenting;
      };
    });

    return () => {
      mm.revert();
      cleanups.forEach((f) => f());
    };
  }, []);

  return (
    <section ref={ref} id="work" aria-labelledby="work-title" className="work">
      <div data-stage="" className="work__stage">
        <div data-veil="" className="work__veil" aria-hidden="true" />
        <div className="work__room" aria-hidden="true">
          <div className="work__curve work__curve--vault" />
          <div className="work__curve work__curve--east" />
          <div className="work__curve work__curve--west" />
          <div className="work__paper" />
          <div className="absolute inset-0">
            {projects.map((p) => (
              <div key={p.name} data-room-light="" className={`work__light work__light--${p.light}`} />
            ))}
          </div>
          <canvas data-room-dust="" className="work__dust" />
        </div>
        <div className="work__fade work__fade--top" aria-hidden="true" />
        <div className="work__fade work__fade--bottom" aria-hidden="true" />
        <header className="work__head">
          <p className="work__eyebrow">Case studies</p>
          <h2 id="work-title" className="work__title">
            Selected <em>work</em>
          </h2>
        </header>
        <div data-orbit="" className="orbit">
          <svg data-floor="" className="orbit__floor" aria-hidden="true">
            <path data-floor-rim="" className="orbit__rim" />
            <path data-floor-rim="" className="orbit__rim orbit__rim--inner" />
            <path data-floor-ticks="" className="orbit__ticks" />
            <path data-floor-ticks="" className="orbit__ticks orbit__ticks--far" />
            {projects.map((p) => (
              <circle key={p.name} data-floor-station="" className="orbit__station" />
            ))}
          </svg>
          <ol data-ring="" className="orbit__ring">
            {projects.map((p) => (
              <ProjectCard key={p.name} project={p} />
            ))}
          </ol>
        </div>
        <div className="work__rail" aria-hidden="true">
          <span className="work__mini">
            {projects.map((p) => (
              <i key={p.name} data-mini="" />
            ))}
          </span>
          <span data-hint="" className="work__hint">
            Scroll to turn
          </span>
        </div>
      </div>
      <div className="work__tail" aria-hidden="true" />
    </section>
  );
}

function ProjectCard({ project: p }) {
  const id = slug(p.name);
  const [primary, ...rest] = p.links;
  return (
    <li data-card="" data-light={p.light} data-plate={p.plate} className="orbit__slot">
      <div data-shadow="" className="slab__shadow" aria-hidden="true">
        <div data-shadow-shift="" className="slab__shadow-shift">
          <div className="slab__shadow-far" />
          <div className="slab__shadow-near" />
        </div>
      </div>
      <div data-tilt="" className="slab">
        <div data-layer="" className="slab__back" aria-hidden="true" />
        <article data-layer="" data-face="" className="card" aria-labelledby={id}>
          <div className="card__plate">
            <div data-mark="" data-cut={p.mark.cut} className="card__mark" aria-hidden="true" lang={p.mark.lang}>
              <span>{p.mark.text}</span>
            </div>
            <div data-copy="" className="card__copy">
              <div className="card__head">
                <div>
                  <h3 id={id} className="card__title">
                    {p.name}
                  </h3>
                  <p className="card__meta">
                    {p.category}, {p.year}
                  </p>
                </div>
                <p className="card__detail">{p.detail}</p>
              </div>
              <p className="card__line">
                {p.line} <em>{p.emphasis}</em>
              </p>
              <p className="card__summary">{p.summary}</p>
              <div className="card__foot">
                <p className="card__stack">
                  <span className="sr-only">Built with </span>
                  {p.stack.map((tech, i) => (
                    <span key={tech}>
                      {i > 0 && (
                        <>
                          <span aria-hidden="true" className="card__slash">
                            /
                          </span>
                          <span className="sr-only">, </span>
                        </>
                      )}
                      {tech}
                    </span>
                  ))}
                </p>
                <div className="card__actions">
                  {rest.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card__aside"
                      aria-label={`${p.name} on ${link.label} (opens in a new tab)`}
                    >
                      {link.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                  <a
                    href={primary.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card__cta"
                    aria-label={`${p.name}: ${primary.label} (opens in a new tab)`}
                  >
                    {primary.label === "GitHub" ? "View on GitHub" : `View ${primary.label.toLowerCase()}`}
                    <span className="card__knob">
                      <span className="card__arrow">
                        <Arrow />
                      </span>
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div data-gloss-track="" className="card__gloss-track" aria-hidden="true">
            <div data-gloss="" className="card__gloss" />
          </div>
          <div data-spot="" className="card__spot" aria-hidden="true" />
        </article>
      </div>
    </li>
  );
}
