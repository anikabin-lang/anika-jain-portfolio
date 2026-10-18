import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "../lib/motion";
import { pageScroll } from "../lib/pageScroll";

// Lenis smooth scrolling driven by GSAP's ticker, plus scroll restoration that
// survives pinned sections (reloads return to where you were).
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({
      lerp: 0.12,
      wheelMultiplier: 0.9,
      autoRaf: false,
      anchors: {
        onStart: () => (pageScroll.travelling = true),
        onComplete: () => (pageScroll.travelling = false),
      },
    });
    pageScroll.attach(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf, false, true);
    gsap.ticker.lagSmoothing(0);
    const stop = () => (pageScroll.travelling = false);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      gsap.ticker.remove(raf);
      pageScroll.detach(lenis);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const key = `scroll:${window.location.pathname}`;
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const save = () => {
      try {
        sessionStorage.setItem(key, String(Math.round(window.scrollY)));
      } catch {
        /* storage unavailable */
      }
    };
    window.addEventListener("pagehide", save);
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(key)) || 0;
    } catch {
      saved = 0;
    }
    const [nav] = performance.getEntriesByType("navigation");
    const returning = nav?.type === "reload" || nav?.type === "back_forward";
    let anchor = null;
    try {
      const id = decodeURIComponent(window.location.hash.slice(1));
      anchor = id ? document.getElementById(id) : null;
    } catch {
      anchor = null;
    }
    // Pinned sections are wrapped in a pin-spacer; measure that instead.
    const anchorTop = (el) => {
      const box = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
      return Math.round(box.getBoundingClientRect().top + window.scrollY);
    };
    const target = returning && saved > 0 ? () => saved : anchor ? () => anchorTop(anchor) : null;
    let restore = () => {};
    if (target) {
      restore = () => window.scrollTo(0, target());
      ScrollTrigger.addEventListener("refresh", restore);
      const once = () => ScrollTrigger.removeEventListener("refresh", restore);
      window.setTimeout(once, 2500);
    }
    return () => {
      window.removeEventListener("pagehide", save);
      ScrollTrigger.removeEventListener("refresh", restore);
      history.scrollRestoration = previous;
    };
  }, []);

  return null;
}
