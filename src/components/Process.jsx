import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "../lib/motion";
import { process as steps } from "../data/site";

// Each sheet swings in like a card turned towards the viewer as it scrolls
// into view; its words then rise in, one after another.
const TURN_START = 0;
const TURN_SPAN = 0.7;
const FADE_START = 0;
const FADE_SPAN = 0.12;
const WORDS_START = 0.5;
const WORDS_SPAN = 0.28;
const WORDS_STAGGER = 0.06;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const window01 = (v, start, span) => clamp01((v - start) / span);
const RAD = Math.PI / 180;

// Shared by the resume sections below, which reuse the same rising words.
export function useRisingWords(ref) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    const ease = gsap.parseEase("power3.out");
    const ctx = gsap.context(() => {
      root.querySelectorAll("[data-rise-group]").forEach((group) => {
        const words = [...group.querySelectorAll("[data-words]")];
        const draw = (p) =>
          words.forEach((el, i) => {
            const r = ease(window01(p, Math.min(0.5, i * WORDS_STAGGER), 0.5));
            el.style.opacity = r > 0.999 ? "" : r.toFixed(3);
            el.style.transform =
              r > 0.999
                ? ""
                : `perspective(520px) translate3d(0, ${(12 * (1 - r)).toFixed(2)}px, 0) rotateX(${(62 * (1 - r)).toFixed(2)}deg)`;
          });
        const st = ScrollTrigger.create({
          trigger: group,
          start: "top 92%",
          end: "top 52%",
          onUpdate: (self) => draw(self.progress),
          onRefresh: (self) => draw(self.progress),
        });
        draw(st.progress);
      });
    }, root);
    return () => {
      ctx.revert();
      root.querySelectorAll("[data-words]").forEach((el) => el.removeAttribute("style"));
    };
  }, [ref]);
}

export function Process() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const section = ref.current;
    if (!section || prefersReducedMotion()) return;
    const items = [...section.querySelectorAll("[data-step]")];
    const ease = {
      turn: gsap.parseEase("power1.out"),
      fade: gsap.parseEase("power1.out"),
      word: gsap.parseEase("power3.out"),
    };
    const cache = new WeakMap();
    const set = (el, prop, value) => {
      const c = cache.get(el) ?? {};
      if (c[prop] === value) return;
      c[prop] = value;
      cache.set(el, c);
      el.style[prop] = value;
    };
    const touched = [];

    const ctx = gsap.context(() => {
      items.forEach((item, index) => {
        const sheet = item.querySelector("[data-sheet]");
        const shades = [...item.querySelectorAll("[data-shade]")];
        const glint = item.querySelector("[data-glint]");
        const shadow = item.querySelector("[data-shadow]");
        const near = item.querySelector("[data-shadow-near]");
        const far = item.querySelector("[data-shadow-far]");
        const words = [...item.querySelectorAll("[data-words]")];
        if (!sheet || !shades.length || !glint || !shadow || !near || !far) return;
        touched.push(sheet, ...shades, glint, shadow, near, far, ...words);
        const view = { side: -1, eyeX: 0, eyeY: 0, start: 0, span: 1 };

        // Cards in the same row turn about the row's centre and start in turn.
        const measure = () => {
          const row = items.filter((o) => Math.abs(o.offsetTop - item.offsetTop) < 4);
          const pos = Math.max(0, row.indexOf(item));
          const first = row[0];
          const last = row[row.length - 1];
          const centre = first && last ? (first.offsetLeft + last.offsetLeft + last.offsetWidth) / 2 : 0;
          const off = row.length > 1 ? item.offsetLeft + item.offsetWidth / 2 - centre : 0;
          view.side = Math.abs(off) < 1 ? (index % 2 ? 1 : -1) : Math.sign(off);
          view.eyeX = -off;
          view.eyeY = -(0.2 * item.offsetHeight);
          view.start = 0.16 * pos;
          view.span = 1 - (row.length - 1) * 0.16;
        };

        const draw = (progress) => {
          const p = clamp01((progress - view.start) / view.span);
          const turned = ease.turn(window01(p, TURN_START, TURN_SPAN));
          const left = 1 - turned;
          const yaw = 62 * view.side * left;
          const depth = 170 * left;
          const seen = ease.fade(window01(p, FADE_START, FADE_SPAN));
          const { eyeX, eyeY } = view;
          set(
            sheet,
            "transform",
            left < 5e-4
              ? ""
              : `translate(${eyeX.toFixed(1)}px, ${eyeY.toFixed(1)}px) perspective(1300px) translate(${(-eyeX).toFixed(1)}px, ${(-eyeY).toFixed(1)}px) translate3d(0, ${(60 * left).toFixed(2)}px, ${depth.toFixed(2)}px) rotateY(${yaw.toFixed(3)}deg)`,
          );
          set(sheet, "opacity", seen > 0.999 ? "" : seen.toFixed(3));
          const facing = Math.cos(yaw * RAD) - 0.5 * Math.sin(yaw * RAD);
          const dark = left < 5e-4 ? "0" : (0.22 * clamp01(1 - facing)).toFixed(3);
          for (const s of shades) set(s, "opacity", dark);
          const flash = Math.sin(Math.PI * turned) ** 2;
          const travel = view.side < 0 ? 1 - turned : turned;
          set(glint, "opacity", flash < 0.001 ? "0" : (0.85 * flash).toFixed(3));
          set(glint, "transform", `translate3d(${(-100 + 282 * travel).toFixed(1)}%, 0, 0)`);
          const lifted = depth / 170;
          set(
            shadow,
            "transform",
            left < 5e-4
              ? ""
              : `translate3d(${(0.3 * depth).toFixed(2)}px, ${(0.24 * depth).toFixed(2)}px, 0) scaleX(${(Math.cos(yaw * RAD) * (1 + depth / 1300)).toFixed(4)})`,
          );
          set(shadow, "opacity", seen > 0.999 ? "" : seen.toFixed(3));
          set(near, "opacity", lifted < 0.001 ? "" : (1 - lifted).toFixed(3));
          set(far, "opacity", lifted < 0.001 ? "0" : (0.9 * lifted).toFixed(3));
          words.forEach((el, i) => {
            const r = ease.word(window01(p, WORDS_START + i * WORDS_STAGGER, WORDS_SPAN));
            set(el, "opacity", r > 0.999 ? "" : r.toFixed(3));
            set(
              el,
              "transform",
              r > 0.999
                ? ""
                : `perspective(520px) translate3d(0, ${(12 * (1 - r)).toFixed(2)}px, 0) rotateX(${(62 * (1 - r)).toFixed(2)}deg)`,
            );
          });
        };

        measure();
        const st = ScrollTrigger.create({
          trigger: item,
          start: "top 86%",
          end: "top 30%",
          onUpdate: (self) => draw(self.progress),
          onRefresh: (self) => {
            measure();
            draw(self.progress);
          },
        });
        draw(st.progress);
      });
    }, section);

    return () => {
      ctx.revert();
      for (const el of touched) el.removeAttribute("style");
    };
  }, []);

  return (
    <section ref={ref} id="process" aria-labelledby="process-title" className="process">
      <header className="process__head">
        <p className="process__eyebrow">Process</p>
        <h2 id="process-title" className="process__title">
          How I <em>work</em>
        </h2>
      </header>
      <ol className="process__steps">
        {steps.map((step, i, all) => (
          <li
            key={step.name}
            data-step=""
            data-paper={step.paper}
            className="process__step"
            style={{ "--at": all.length > 1 ? i / (all.length - 1) : 0 }}
          >
            <span data-shadow="" aria-hidden="true" className="process__shadow">
              <span data-shadow-near="" className="process__shadow-near" />
              <span data-shadow-far="" className="process__shadow-far" />
            </span>
            <div data-sheet="" className="process__sheet">
              <p className="process__tab">
                <span data-words="">{step.when}</span>
                <span data-shade="" aria-hidden="true" className="process__shade" />
              </p>
              <div className="process__face">
                <h3 className="process__name">
                  <span data-words="" className="process__verb">
                    {step.name}
                  </span>{" "}
                  <em data-words="">{step.emphasis}</em>
                </h3>
                <p data-words="" className="process__text">
                  {step.text}
                </p>
                <p data-words="" className="process__yields">
                  <span className="sr-only">What comes of it: </span>
                  {step.yields.map((y, j) => (
                    <span key={y}>
                      {j > 0 && (
                        <>
                          <span aria-hidden="true" className="process__slash">
                            /
                          </span>
                          <span className="sr-only">, </span>
                        </>
                      )}
                      {y}
                    </span>
                  ))}
                </p>
                <span data-shade="" aria-hidden="true" className="process__shade" />
                <span data-glint="" aria-hidden="true" className="process__glint" />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
