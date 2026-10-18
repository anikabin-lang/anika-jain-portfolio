import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, GLIDE, registerGlide, remeasure, scrollFor, anticipatePin, clamp, prefersReducedMotion } from "../lib/motion";
import { direction, STAGE_LAYOUT } from "../lib/direction";
import { site } from "../data/site";

// Timeline landmarks (seconds of timeline; 1s = scrollFor(1) px of scrolling).
const SCAN_START = 1.85;
const SCAN_LENGTH = 5;
const VERIFIED = 6.85;
const STAMP = 7.09;
const EXIT = 7.6;
const END = EXIT + 0.05 + 1.3;
const LEAD_IN = 1.8; // timeline already played before the section pins
const CRAMPED = ["line", "tight", "bare"];

const ICONS = {
  name: "M8 8.2a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4ZM2.8 13.6c.6-2.6 2.7-3.9 5.2-3.9s4.6 1.3 5.2 3.9",
  role: "M6 4.5 2.5 8 6 11.5M10 4.5 13.5 8 10 11.5",
  education: "M1.8 6.2 8 3.2l6.2 3L8 9.2Zm2.4 1.2v3.2c1 1 2.4 1.6 3.8 1.6s2.8-.6 3.8-1.6V7.4M14.2 6.2v3.6",
  institution: "M2.5 13.5h11M3.5 13.5V7M6.5 13.5V7M9.5 13.5V7M12.5 13.5V7M2.5 7h11L8 2.8Z",
  location: "M8 14s4.2-3.9 4.2-7.4a4.2 4.2 0 0 0-8.4 0C3.8 10.1 8 14 8 14ZM8 8.1a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z",
  currently: "M3 8h10M9.2 4.2 13 8l-3.8 3.8",
};

const facts = site.identity.facts.map((f, i, all) => ({ ...f, at: 0.08 + (0.8 * i) / Math.max(1, all.length - 1) }));
const stampText = `Identity verified · ${site.badge.pass} № ${site.badge.serial} · ${site.badge.edition} · `.toUpperCase();

const ring = (cx, cy, radii) => radii.map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join("");
const CURVES = ring(1360, 1140, [430, 640, 850, 1060, 1270]) + ring(-220, -300, [560, 800]);
const BACKDROP = `
  <div class="identity-backdrop__sun"></div>
  <svg class="identity-backdrop__curves" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" fill="none" stroke-width="1.6" aria-hidden="true">
    <g class="shade" transform="translate(-1.5 1.5)">${CURVES}</g>
    <g class="lit" transform="translate(1.2 -1.2)">${CURVES}</g>
  </svg>
  <div class="identity-backdrop__dim"></div>`;

export function Identity() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const section = ref.current;
    const wall = document.querySelector(".wall");
    const frame = section?.querySelector("[data-frame]");
    const beam = section?.querySelector("[data-beam]");
    const status = section?.querySelector("[data-status]");
    const count = section?.querySelector("[data-count]");
    const panel = section?.querySelector("[data-panel]");
    if (!section || !wall || !frame || !beam || !status || !count || !panel) return;
    const factEls = [...section.querySelectorAll("[data-fact]")];
    const verdict = [...section.querySelectorAll("[data-verdict] > :not([data-stamp])")];
    const stamp = section.querySelector("[data-stamp]");
    const tickMark = stamp?.querySelector("[data-stamp-tick]");
    const reduced = prefersReducedMotion();

    const backdrop = document.createElement("div");
    backdrop.className = "identity-backdrop";
    backdrop.innerHTML = BACKDROP;
    wall.insertBefore(backdrop, wall.querySelector(".wall__grain"));
    const curves = backdrop.querySelector(".identity-backdrop__curves");

    // Mirror the badge's identity-mark rect so the frame hugs it; on small
    // screens progressively trim the panel until it fits.
    const overflows = () => panel.offsetTop + panel.offsetHeight > section.clientHeight - 16;
    const place = () => {
      const { x, y, width, height } = direction.frame;
      section.style.setProperty("--fx", `${x}px`);
      section.style.setProperty("--fy", `${y}px`);
      section.style.setProperty("--fw", `${width}px`);
      section.style.setProperty("--fh", `${height}px`);
      delete section.dataset.cramped;
      if (window.innerWidth >= 1024) return;
      for (const level of CRAMPED) {
        if (!overflows()) break;
        section.dataset.cramped = level;
      }
    };
    place();
    window.addEventListener(STAGE_LAYOUT, place);
    let disposed = false;
    document.fonts.ready.then(() => !disposed && place());

    const phase = { enter: 0, exit: 0 };
    const room = { scan: 0, light: 0, room: 0, steady: 0 };
    let shown = 0;
    let trigger;
    let onRefresh;
    let stopLeadRef = () => {};
    const lead = { lead: 0, free: false, since: 0, ticking: false };

    const ctx = gsap.context(() => {
      gsap.set(frame, { autoAlpha: 0, scale: 1.035 });
      gsap.set(beam, { autoAlpha: 0 });
      gsap.set(factEls, { "--rule": 0 });
      gsap.set(section.querySelectorAll("[data-fact] path"), { strokeDashoffset: 1 });
      gsap.set(section.querySelectorAll("[data-fact] dt, [data-fact] dd"), { autoAlpha: 0, y: 14 });
      gsap.set(verdict, { autoAlpha: 0, y: 16 });
      if (stamp) gsap.set(stamp, reduced ? { autoAlpha: 0 } : { autoAlpha: 0, scale: 1.55, rotation: -16 });
      if (tickMark) gsap.set(tickMark, { strokeDashoffset: 1 });
      registerGlide();

      const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      tl.to(phase, { enter: 1, duration: 1.476, ease: GLIDE }, 0)
        .to(room, { steady: 1, duration: 0.648, ease: "sine.inOut" }, 0.9)
        .to(frame, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "power2.out" }, 1.1)
        .to(room, { light: 1, room: 1, duration: 0.6, ease: "power1.inOut" }, 1.1)
        .to(beam, { autoAlpha: 1, duration: 0.25, ease: "power1.out" }, 1.55)
        .fromTo(frame, { "--scan": 0 }, { "--scan": 1, duration: SCAN_LENGTH, ease: "none" }, SCAN_START)
        .fromTo(room, { scan: 0 }, { scan: 1, duration: SCAN_LENGTH, ease: "none" }, SCAN_START);
      // Each fact is "read" as the beam passes its height in the list.
      factEls.forEach((el, i) => {
        const at = SCAN_START + SCAN_LENGTH * facts[i].at;
        tl.to(el, { "--rule": 1, duration: 0.55, ease: "power2.inOut" }, at)
          .to(el.querySelectorAll("path"), { strokeDashoffset: 0, duration: 0.55, ease: "power2.inOut" }, at + 0.03)
          .to(el.querySelector("dt"), { autoAlpha: 1, y: 0, duration: 0.45 }, at + 0.03)
          .to(el.querySelector("dd"), { autoAlpha: 1, y: 0, duration: 0.55 }, at + 0.08);
      });
      tl.to(beam, { autoAlpha: 0, duration: 0.35, ease: "power1.out" }, VERIFIED)
        .to(room, { light: 0.4, room: 0.45, duration: 0.55, ease: "power1.inOut" }, VERIFIED + 0.05)
        .to(frame, { autoAlpha: 0, scale: 1.02, duration: 0.5, ease: "power1.inOut" }, VERIFIED + 0.1)
        .to(verdict, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, VERIFIED + 0.06);
      if (stamp) tl.to(stamp, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.22, ease: "power2.in" }, STAMP);
      if (tickMark) tl.to(tickMark, { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" }, STAMP + 0.154);
      tl.to(panel, { autoAlpha: 0, y: -26, duration: 0.5, ease: "power2.in" }, EXIT).to(
        phase,
        { exit: 1, duration: 1.3, ease: GLIDE },
        EXIT + 0.05,
      );
      remeasure();

      trigger = ScrollTrigger.create({
        id: "identity",
        trigger: section,
        start: "top top",
        end: () => `+=${scrollFor(END - LEAD_IN)}`,
        pin: true,
        anticipatePin: anticipatePin(),
        refreshPriority: 1,
      });
      const approach = () => Math.max(1, Math.min(trigger.start, window.innerHeight));
      // Map scroll position to timeline time; the first 1.8s play while the
      // section scrolls into view.
      const timeAt = (y) =>
        y < trigger.start
          ? clamp(LEAD_IN * (1 - (trigger.start - y) / approach()), 0, LEAD_IN)
          : clamp(LEAD_IN + (y - trigger.start) / scrollFor(1), LEAD_IN, END);
      let target = timeAt(window.scrollY);
      let last = -1;
      let label = "";

      const apply = () => {
        // The scan never runs ahead of the badge: it waits until the badge has
        // settled on the mark, then catches up with scrolling.
        const t = lead.free || target <= SCAN_START ? target : Math.min(target, SCAN_START + lead.lead);
        const next = t >= VERIFIED ? "Verified" : !lead.free && target > SCAN_START && lead.lead === 0 ? "Aligning" : "Reading";
        if (next !== label) {
          label = next;
          status.textContent = next;
        }
        if (t === last) return;
        last = t;
        tl.time(t, true);
        count.textContent = String(Math.round(100 * room.scan)).padStart(3, "0");
        const here = phase.enter * (1 - phase.exit);
        shown = here;
        direction.shift = here;
        direction.zoom = here;
        direction.scan = room.scan;
        direction.light = room.light * (1 - phase.exit);
        direction.steady = room.steady * (1 - phase.exit);
        backdrop.style.setProperty("--here", here.toFixed(3));
        backdrop.dataset.here = String(here > 0);
        backdrop.style.setProperty("--dim", (room.room * (1 - phase.exit)).toFixed(3));
      };
      const stopLead = () => {
        if (!lead.ticking) return;
        lead.ticking = false;
        gsap.ticker.remove(catchUp);
      };
      const catchUp = (_t, deltaMs) => {
        if (lead.free || target <= SCAN_START) return stopLead();
        if (direction.placed || lead.lead > 0 || performance.now() - lead.since > 6000) {
          lead.lead += (Math.min(deltaMs, 50) / 1000) * 4;
          if (SCAN_START + lead.lead >= target) lead.free = true;
        }
        apply();
        if (lead.free) stopLead();
      };
      onRefresh = () => {
        target = timeAt(window.scrollY);
        if (target >= EXIT) lead.free = true;
        else if (target <= SCAN_START) {
          lead.free = false;
          lead.lead = 0;
        } else if (!lead.free && !lead.ticking) {
          if (direction.placed && lead.lead === 0) lead.free = true;
          else {
            lead.since = performance.now();
            lead.ticking = true;
            gsap.ticker.add(catchUp);
          }
        }
        apply();
      };
      onRefresh();
      ScrollTrigger.create({ start: () => trigger.start - approach(), end: () => trigger.end, onUpdate: onRefresh });
      ScrollTrigger.addEventListener("refresh", onRefresh);
      stopLeadRef = stopLead;
    }, section);

    const toX = curves && !reduced ? gsap.quickTo(curves, "x", { duration: 1.4, ease: "power3.out" }) : null;
    const toY = curves && !reduced ? gsap.quickTo(curves, "y", { duration: 1.4, ease: "power3.out" }) : null;
    const onPointer = (e) => {
      if (e.pointerType === "touch" || shown <= 0) return;
      toX?.(-((e.clientX / window.innerWidth - 0.5) * 22));
      toY?.(-((e.clientY / window.innerHeight - 0.5) * 14));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      disposed = true;
      stopLeadRef();
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      ctx.revert();
      window.removeEventListener(STAGE_LAYOUT, place);
      window.removeEventListener("pointermove", onPointer);
      backdrop.remove();
      delete section.dataset.cramped;
      Object.assign(direction, { shift: 0, zoom: 0, scan: 0, light: 0, steady: 0 });
    };
  }, []);

  return (
    <section ref={ref} id="identity" data-identity="" aria-labelledby="identity-title" className="identity">
      <div className="identity__frame" data-frame="" aria-hidden="true">
        <i className="identity__corner identity__corner--tl" />
        <i className="identity__corner identity__corner--tr" />
        <i className="identity__corner identity__corner--bl" />
        <i className="identity__corner identity__corner--br" />
        <span className="identity__tag identity__tag--tl">Identity check</span>
        <span className="identity__tag identity__tag--tr">№ {site.badge.serial}</span>
        <span className="identity__tag identity__tag--bl" data-status="">
          Reading
        </span>
        <span className="identity__tag identity__tag--br">
          <span data-count="">000</span>%
        </span>
        <div className="identity__beam" data-beam="" />
      </div>
      <div className="identity__panel" data-panel="">
        <dl className="identity__facts">
          {facts.map((fact) => (
            <div key={fact.label} className="identity__fact" data-fact="">
              <dt>
                <svg className="identity__icon" viewBox="0 0 16 16" aria-hidden="true">
                  <path d={ICONS[fact.icon]} pathLength="1" />
                </svg>
                {fact.label}
              </dt>
              <dd>
                {fact.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <div className="identity__verdict" data-verdict="">
          <h2 id="identity-title">
            <i className="identity__seal" aria-hidden="true" />
            <span>
              Identity <em>Verified.</em>
            </span>
          </h2>
          <p>{site.identity.statement}</p>
          <a className="identity__cta" href="#work">
            Explore Selected Work <span aria-hidden="true">↓</span>
          </a>
          <svg className="identity__stamp" data-stamp="" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <path id="identity-stamp-ring" d="M13.8 60a46.2 46.2 0 1 1 92.4 0a46.2 46.2 0 1 1-92.4 0" />
              <filter id="identity-stamp-ink" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="4" />
                <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.3 1.95" />
                <feComposite in="SourceGraphic" operator="in" />
              </filter>
            </defs>
            <g filter="url(#identity-stamp-ink)">
              <circle cx="60" cy="60" r="56" strokeWidth="2.9" />
              <circle cx="60" cy="60" r="41.5" strokeWidth="1.25" />
              <text>
                <textPath href="#identity-stamp-ring" textLength="289">
                  {stampText}
                </textPath>
              </text>
              <path d="M43.5 61.5 54 72l22.5-24.5" pathLength="1" data-stamp-tick="" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
