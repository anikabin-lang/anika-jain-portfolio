import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, GLIDE, registerGlide, scrollFor, anticipatePin, clamp, prefersReducedMotion } from "../lib/motion";
import { direction, STAGE_LAYOUT } from "../lib/direction";
import { Foliage } from "../lib/foliage";
import { site } from "../data/site";

// Timeline landmarks (seconds; 1s = scrollFor(1) px).
const WORDS_AT = 3.002;
const PEN_AT = 3.302;
const SETTLE_AT = 3.502;
const END = 3.902;
const LINKS_AT = 2.372;

const BRANCH = { rootX: 1.04, rootY: 0.02, heading: Math.PI - 0.62, reach: 0.74, bow: -0.3, shade: "rgb(88 84 78)", seed: 0x1352889 };

// A hand-drawn underline: a cubic path plus a filled "ink" outline whose width
// swells in the middle, revealed by a stroked mask.
const round2 = (v) => Math.round(100 * v) / 100;
const UNDERLINE = (() => {
  const curve = [[3, 12], [60, 16.5], [150, 15], [237, 5]];
  const swell = (t) => 0.45 + 2.75 * Math.sin(Math.PI * t ** (Math.log(0.5) / Math.log(0.36)));
  const steps = 72;
  const upper = [];
  const lower = [];
  const [a, b, c, d] = curve;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const m = 1 - t;
    const x = m ** 3 * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t ** 3 * d[0];
    const y = m ** 3 * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t ** 3 * d[1];
    const dx = 3 * m * m * (b[0] - a[0]) + 6 * m * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0]);
    const dy = 3 * m * m * (b[1] - a[1]) + 6 * m * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1]);
    const half = swell(t) / 2 / (Math.hypot(dx, dy) || 1);
    upper.push(`${round2(x - dy * half)} ${round2(y + dx * half)}`);
    lower.push(`${round2(x + dy * half)} ${round2(y - dx * half)}`);
  }
  return {
    path: `M${a.join(" ")}C${b.join(" ")} ${c.join(" ")} ${d.join(" ")}`,
    ink: `M${upper.join("L")}L${lower.reverse().join("L")}Z`,
  };
})();

const ring = (cx, cy, radii) => radii.map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join("");
const CURVES = ring(800, 1330, [1010, 1240]) + ring(2050, 420, [900]) + ring(-450, 420, [900]);
const BACKDROP = `
  <div class="contact-backdrop__sun"></div>
  <div class="contact-backdrop__rays"></div>
  <svg class="contact-backdrop__curves" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" fill="none" stroke-width="1.6" aria-hidden="true">
    <g class="shade" transform="translate(-1.5 1.5)">${CURVES}</g>
    <g class="lit" transform="translate(1.2 -1.2)">${CURVES}</g>
  </svg>
  <canvas class="contact-backdrop__leaves"></canvas>
  <div class="contact-backdrop__ground"></div>`;

export function Contact() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const section = ref.current;
    const wall = document.querySelector(".wall");
    const back = document.querySelector("[data-badge-back]");
    const stage = back?.closest(".stage");
    const said = section?.querySelector("[data-said]");
    if (!section || !wall || !back || !stage || !said) return;
    const link = (name) => back.querySelector(`[data-contact="${name}"]`);
    const email = link("email");
    const phone = link("phone");
    const github = link("github");
    const linkedin = link("linkedin");
    const resume = link("resume");
    const qr = link("qr");
    if (!email || !phone || !github || !linkedin || !resume || !qr) return;
    const rows = [email, phone, github, linkedin, resume, qr];
    const words = [...section.querySelectorAll("[data-word]")];
    const pen = section.querySelector("[data-pen]");
    const glance = stage.querySelector("[data-badge-glance]");
    const reduced = prefersReducedMotion();
    const closing = direction.closing;
    const offs = [];
    const on = (el, type, fn) => {
      el.addEventListener(type, fn);
      offs.push(() => el.removeEventListener(type, fn));
    };
    section.dataset.live = "true";

    const backdrop = document.createElement("div");
    backdrop.className = "contact-backdrop";
    backdrop.innerHTML = BACKDROP;
    wall.insertBefore(backdrop, wall.querySelector(".wall__grain"));
    const curves = backdrop.querySelector(".contact-backdrop__curves");
    const leaves = backdrop.querySelector(".contact-backdrop__leaves");
    const leavesCtx = leaves?.getContext("2d") ?? null;
    const branch = new Foliage(BRANCH);
    let clock = 0;
    const drawBranch = () => leavesCtx && branch.draw(leavesCtx, clock, direction.air);
    const fitBranch = () => leaves && branch.fit(leaves) && drawBranch();
    fitBranch();
    window.addEventListener("resize", fitBranch);

    // Keep the closing words between the lowered card and the floor.
    const place = () => {
      const { y, height } = closing.frame;
      const floor = closing.floor || window.innerHeight;
      section.style.setProperty("--card-bottom", `${Math.round(y + height)}px`);
      section.style.setProperty("--floor", `${Math.round(Math.max(0, window.innerHeight - floor))}px`);
    };
    place();
    window.addEventListener(STAGE_LAYOUT, place);
    registerGlide();

    const look = { lower: 0, zoom: 0, turn: 0, sun: 0, steady: 0 };
    let pin;
    let present = -1;
    const ctx = gsap.context(() => {
      gsap.set([...rows, ...words], { autoAlpha: 0, y: 24, filter: "blur(8px)" });
      if (pen) gsap.set(pen, { strokeDashoffset: 1 });
      const tl = gsap.timeline({ paused: true, defaults: { ease: GLIDE } });
      tl.to(look, { lower: 1, duration: 1.1 }, 0)
        .to(look, { zoom: 1, duration: 1.5 }, 0)
        .to(look, { sun: 1, duration: 0.9 }, 0.6)
        .to(look, { steady: 1, duration: 0.45, ease: "none" }, 0.95)
        .to(look, { turn: 1, duration: 1.7 }, 1.25);
      rows.forEach((row, i) =>
        tl.to(row, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.5, ease: "power2.out" }, LINKS_AT + 0.1 * i),
      );
      tl.to(words, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.5, stagger: 0.12, ease: "power2.out" }, WORDS_AT)
        .to(look, { sun: 0.58, duration: END - SETTLE_AT }, SETTLE_AT)
        .to(look, { steady: 0.5, duration: END - SETTLE_AT, ease: "none" }, SETTLE_AT);
      if (pen) tl.to(pen, { strokeDashoffset: 0, duration: 0.55, ease: "power1.inOut" }, PEN_AT);

      pin = ScrollTrigger.create({
        id: "contact",
        trigger: section,
        start: "top top",
        end: () => `+=${scrollFor(END - 0.3)}`,
        pin: true,
        anticipatePin: anticipatePin(),
      });
      let last = -1;
      let swing = 1;
      const sync = () => {
        const y = window.scrollY;
        const vh = window.innerHeight;
        const p = clamp((y - (pin.start - 1.3 * vh)) / (0.35 * vh), 0, 1);
        if (p !== present) {
          present = p;
          backdrop.dataset.here = String(p > 0);
          backdrop.style.setProperty("--present", p.toFixed(3));
        }
        backdrop.style.setProperty("--arrive", clamp(1 - (pin.start - y) / vh, 0, 1).toFixed(3));
        const t = clamp(0.3 + (y - pin.start) / scrollFor(1), 0, END);
        if (t === last) return;
        // A small sideways sway as the card finishes its turn.
        if (!reduced && last >= 0 && last < SETTLE_AT && t >= SETTLE_AT) {
          direction.push = 64 * swing;
          swing = -swing;
        }
        last = t;
        tl.time(t, true);
        closing.lower = look.lower;
        closing.zoom = look.zoom;
        closing.sun = look.sun;
        closing.steady = look.steady;
        closing.turn = reduced ? Math.round(look.turn) : look.turn;
        backdrop.style.setProperty("--sun", look.sun.toFixed(3));
      };
      ScrollTrigger.create({ start: 0, end: "max", onUpdate: sync, onRefresh: sync });
      sync();
    }, section);

    const breeze = (_t, deltaMs) => {
      if (reduced || present <= 0 || look.sun < 0.01) return;
      clock += Math.min(deltaMs / 1000, 0.05);
      drawBranch();
    };
    gsap.ticker.add(breeze);

    // A streak of light across the laminate.
    const sweep = (strength, seconds) => {
      if (!glance || reduced) return;
      glance.animate(
        [
          { transform: "translateX(372%) skewX(-16deg)", opacity: 0 },
          { opacity: strength, offset: 0.22 },
          { opacity: strength, offset: 0.7 },
          { transform: "translateX(0%) skewX(-16deg)", opacity: 0 },
        ],
        { duration: 1000 * seconds, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      );
    };
    const timers = new Map();
    const done = (el, ms) => {
      el.dataset.state = "done";
      window.clearTimeout(timers.get(el));
      timers.set(el, window.setTimeout(() => delete el.dataset.state, ms));
    };

    on(email, "pointerenter", () => sweep(0.95, 1.1));
    // Copy the address; only confirm when the clipboard write succeeded,
    // otherwise fall back to opening a new email.
    on(email, "click", (e) => {
      if (!navigator.clipboard?.writeText) return;
      e.preventDefault();
      navigator.clipboard.writeText(site.email).then(
        () => {
          done(email, 1900);
          said.textContent = "Email address copied.";
        },
        () => {
          window.location.href = `mailto:${site.email}`;
        },
      );
    });
    on(phone, "pointerenter", () => sweep(0.6, 1.4));
    const deepen = (v) => gsap.to(stage, { "--deep": v, duration: 0.7, ease: "power2.out", overwrite: true });
    on(github, "pointerenter", () => deepen(1));
    on(github, "pointerleave", () => deepen(0));
    on(linkedin, "pointerenter", () => sweep(0.5, 1.7));
    on(resume, "click", () => done(resume, 1700));
    on(qr, "click", () => {
      qr.dataset.open = String(qr.dataset.open !== "true");
    });

    // Keyboard users reach the badge links through the visually hidden list;
    // mirror their focus onto the card and make sure it is fully turned.
    section.querySelectorAll("[data-for]").forEach((a) => {
      const twin = link(a.dataset.for ?? "");
      if (!twin) return;
      on(a, "focus", () => {
        if (!a.matches(":focus-visible")) return;
        twin.dataset.focus = "true";
        if (window.scrollY < pin.end - 2) window.scrollTo(0, pin.end);
      });
      on(a, "blur", () => delete twin.dataset.focus);
    });

    const toX = curves && !reduced ? gsap.quickTo(curves, "x", { duration: 1.4, ease: "power3.out" }) : null;
    const toY = curves && !reduced ? gsap.quickTo(curves, "y", { duration: 1.4, ease: "power3.out" }) : null;
    const onPointer = (e) => {
      if (e.pointerType === "touch" || present <= 0) return;
      toX?.(-((e.clientX / window.innerWidth - 0.5) * 18));
      toY?.(-((e.clientY / window.innerHeight - 0.5) * 12));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      offs.forEach((f) => f());
      timers.forEach((t) => window.clearTimeout(t));
      gsap.ticker.remove(breeze);
      ctx.revert();
      window.removeEventListener("resize", fitBranch);
      window.removeEventListener(STAGE_LAYOUT, place);
      window.removeEventListener("pointermove", onPointer);
      backdrop.remove();
      delete section.dataset.live;
      rows.forEach((el) => {
        delete el.dataset.state;
        delete el.dataset.focus;
      });
      delete qr.dataset.open;
      Object.assign(closing, { lower: 0, zoom: 0, turn: 0, sun: 0, steady: 0 });
    };
  }, []);

  const [lead, last] = site.closing.heading;
  const { contact } = site;
  return (
    <>
      <section ref={ref} aria-labelledby="contact-title" className="contact">
        <div className="contact__words">
          <h2 id="contact-title" className="contact__heading" data-word="">
            {lead}{" "}
            <em className="contact__last">
              {last}
              <svg className="contact__underline" viewBox="0 0 240 22" aria-hidden="true">
                <mask id="contact-underline" maskUnits="userSpaceOnUse" x="-10" y="-10" width="260" height="42">
                  <path d={UNDERLINE.path} pathLength="1" data-pen="" />
                </mask>
                <path d={UNDERLINE.ink} mask="url(#contact-underline)" />
              </svg>
            </em>
          </h2>
          <p className="contact__invitation" data-word="">
            {site.closing.invitation}
          </p>
          <p className="contact__sign-off" data-word="">
            {site.closing.signOff}
          </p>
        </div>
        <ul className="contact__links" aria-label="Contact">
          <li>
            <a href={`mailto:${site.email}`} data-for="email">
              <span>Email</span> {site.email}
            </a>
          </li>
          <li>
            <a href={site.phone.href} data-for="phone">
              <span>Phone</span> {site.phone.label}
            </a>
          </li>
          <li>
            <a href={contact.github.href} target="_blank" rel="noopener noreferrer" data-for="github">
              <span>GitHub</span> {contact.github.label}
            </a>
          </li>
          <li>
            <a href={contact.linkedin.href} target="_blank" rel="noopener noreferrer" data-for="linkedin">
              <span>LinkedIn</span> {contact.linkedin.label}
            </a>
          </li>
          <li>
            <a href={contact.resume.href} download={contact.resume.file} data-for="resume">
              <span>Resume</span> {contact.resume.label}
            </a>
          </li>
        </ul>
        <p className="sr-only" aria-live="polite" data-said="" />
      </section>
      <div id="contact" aria-hidden="true" />
    </>
  );
}
