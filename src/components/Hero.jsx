import { useCallback, useLayoutEffect, useRef } from "react";
import { gsap, scrollFor, prefersReducedMotion } from "../lib/motion";
import { site } from "../data/site";
import { Stage } from "./Stage";
import { Badge } from "./Badge";
import { Logo } from "./Logo";

// Entrance styles, applied inline so nothing flashes before the badge settles.
const SIGN_HIDDEN = "inset(-40% 100% -60% -10%)";
const HIDDEN = {
  rise: { opacity: 0, transform: "translateY(30px)", filter: "blur(8px)" },
  lift: { opacity: 0, transform: "translateY(18px)" },
  fade: { opacity: 0 },
  sign: { opacity: 0, clipPath: SIGN_HIDDEN },
};
const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const REVEALS = {
  rise: [{ from: HIDDEN.rise, to: { opacity: 1, transform: "none", filter: "none" }, duration: 1250, easing: EXPO }],
  lift: [{ from: HIDDEN.lift, to: { opacity: 1, transform: "none" }, duration: 1050, easing: EXPO }],
  fade: [{ from: HIDDEN.fade, to: { opacity: 1 }, duration: 1700, easing: "ease-out" }],
  // The script name "writes" itself left to right.
  sign: [
    { from: { opacity: 0 }, to: { opacity: 1 }, duration: 250, easing: "ease-out", at: 450 },
    {
      from: { clipPath: SIGN_HIDDEN },
      to: { clipPath: "inset(-40% -15% -60% -10%)" },
      duration: 1200,
      easing: "cubic-bezier(0.65, 0, 0.35, 1)",
      at: 450,
    },
  ],
};

const UNDERLINE =
  "relative after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-out-expo hover:after:origin-left hover:after:scale-x-100";

export const Arrow = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Hero() {
  const heroRef = useRef(null);
  const copyRef = useRef(null);
  const cueRef = useRef(null);
  const ctaRef = useRef(null);
  const revealed = useRef(false);

  // Runs once the badge has dropped in and settled.
  const reveal = useCallback(() => {
    const hero = heroRef.current;
    if (!hero || revealed.current) return;
    revealed.current = true;
    const reduced = prefersReducedMotion();
    const still = (style) => {
      const s = { ...style };
      if (reduced) delete s.transform;
      return s;
    };
    const all = [...hero.querySelectorAll("[data-reveal]")];
    const inCopy = all.filter((el) => copyRef.current?.contains(el));
    for (const el of all) {
      const order = inCopy.indexOf(el);
      const delay = order < 0 ? 0 : 50 + 100 * order;
      for (const { from, to, duration, easing, at = delay } of REVEALS[el.dataset.reveal]) {
        Object.assign(el.style, to);
        el.animate([still(from), still(to)], { duration, easing, delay: at, fill: "backwards" });
      }
    }
  }, []);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.to(copyRef.current, {
        y: -72,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: () => `+=${scrollFor(0.7)}`, scrub: true },
      });
      gsap.to(cueRef.current, {
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: heroRef.current, start: "top top", end: () => `+=${scrollFor(0.3)}`, scrub: true },
      });
    });
    // Magnetic primary button.
    mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
      const btn = ctaRef.current;
      const knob = btn?.querySelector("[data-knob]");
      if (!btn || !knob) return;
      const pos = { x: 0, y: 0 };
      const apply = () => {
        btn.style.translate = `${pos.x.toFixed(2)}px ${pos.y.toFixed(2)}px`;
        knob.style.translate = `${(0.5 * pos.x).toFixed(2)}px ${(0.5 * pos.y).toFixed(2)}px`;
      };
      const toX = gsap.quickTo(pos, "x", { duration: 0.7, ease: "power3.out", onUpdate: apply });
      const toY = gsap.quickTo(pos, "y", { duration: 0.7, ease: "power3.out", onUpdate: apply });
      const onMove = (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2 - pos.x);
        const dy = e.clientY - (r.top + r.height / 2 - pos.y);
        const pull = Math.max(0, 1 - Math.max(Math.abs(dx) - r.width / 2, Math.abs(dy) - r.height / 2, 0) / 90);
        toX(0.1 * dx * pull);
        toY(0.22 * dy * pull);
      };
      const onLeave = () => {
        toX(0);
        toY(0);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        gsap.killTweensOf(pos);
        btn.style.translate = "";
        knob.style.translate = "";
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={heroRef} id="top" data-hero="" className="relative isolate">
      <Stage onSettled={reveal}>
        <Badge />
      </Stage>
      <header data-reveal="fade" style={HIDDEN.fade} className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-20 max-w-[1680px] items-center justify-between px-6 sm:px-10 lg:h-24 lg:px-12">
          <a href="#top" aria-label={`${site.fullName}, back to top`} className="block origin-left scale-[0.86] sm:scale-100">
            <Logo />
          </a>
          <nav aria-label="Primary" className="flex items-center gap-5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] sm:gap-7 lg:gap-10">
            <a href="#identity" className={UNDERLINE}>About</a>
            <a href="#contact" className={UNDERLINE}>Contact</a>
          </nav>
        </div>
      </header>
      <div className="relative z-20 mx-auto flex min-h-svh max-w-[1680px] flex-col px-6 sm:px-10 lg:grid lg:h-svh lg:min-h-[640px] lg:grid-cols-12 lg:gap-x-6 lg:px-12">
        <div
          data-badge-slot=""
          aria-hidden="true"
          className="pointer-events-none h-[clamp(340px,52svh,520px)] shrink-0 md:h-[clamp(480px,60svh,760px)] lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:h-full"
        />
        <div ref={copyRef} className="flex flex-1 flex-col pb-12 pt-1 md:pt-4 lg:col-span-6 lg:col-start-1 lg:row-start-1 lg:justify-center lg:pb-0 lg:pt-12">
          <div>
            <p
              data-reveal="lift"
              style={HIDDEN.lift}
              className="flex items-center gap-3 whitespace-nowrap font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-faint sm:text-[0.6875rem] sm:tracking-[0.18em]"
            >
              <span aria-hidden="true" className="hidden h-px w-8 bg-ink/25 sm:block" />
              Portfolio<span aria-hidden="true" className="text-ink/25">/</span>
              {site.year}
            </p>
            <h1 className="mt-5 font-display text-[clamp(1.9rem,10.6vw,4.25rem)] font-light leading-[0.98] tracking-[-0.03em] md:mt-6 lg:mt-9 lg:text-[clamp(3.25rem,5.6vw,6rem)]">
              <span data-reveal="rise" style={HIDDEN.rise} className="block">
                Hello,
              </span>
              <span
                data-reveal="sign"
                style={HIDDEN.sign}
                data-signature=""
                className="block w-fit origin-bottom-left rotate-[-4deg] whitespace-nowrap font-script text-[1.62em] font-normal leading-[0.86] tracking-normal text-cobalt"
              >
                I’m {site.name}
                <span className="sr-only">,</span>
              </span>
              <span data-reveal="rise" style={HIDDEN.rise} className="hero__closing block italic">
                {site.hero.closing}
              </span>
            </h1>
            <p
              data-reveal="fade"
              style={HIDDEN.fade}
              className="mt-6 max-w-[29rem] text-pretty text-[1.0625rem] leading-[1.5] text-ink-soft md:mt-7 lg:mt-10 lg:text-[1.1875rem] lg:leading-[1.55]"
            >
              {site.hero.intro}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4 md:mt-9 lg:mt-12">
              <a
                ref={ctaRef}
                data-reveal="lift"
                style={HIDDEN.lift}
                href={`mailto:${site.email}`}
                className="group inline-flex h-13 items-center gap-4 rounded-full bg-cobalt pl-7 pr-2 font-mono text-[0.71875rem] uppercase tracking-[0.12em] text-paper transition-colors duration-500 hover:bg-cobalt-deep"
              >
                Start a project
                <span
                  data-knob=""
                  className="grid size-9 place-items-center rounded-full bg-paper text-cobalt transition-[rotate] duration-500 ease-out-expo group-hover:-rotate-45"
                >
                  <Arrow />
                </span>
              </a>
              <a
                data-reveal="lift"
                style={HIDDEN.lift}
                href="#identity"
                className={`inline-flex h-13 items-center font-mono text-[0.71875rem] uppercase tracking-[0.12em] ${UNDERLINE} after:bottom-3`}
              >
                About {site.name}
              </a>
            </div>
          </div>
        </div>
      </div>
      <div data-reveal="fade" style={HIDDEN.fade} className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden lg:tall:block">
        <div className="mx-auto max-w-[1680px] px-12 pb-10">
          <div ref={cueRef} className="flex items-center gap-4 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-faint">
            <span aria-hidden="true" className="scroll-cue__line h-10 w-px bg-ink/15" />
            Scroll
          </div>
        </div>
      </div>
    </section>
  );
}
