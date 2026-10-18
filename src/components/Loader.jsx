import { useEffect, useRef } from "react";
import { announceLift } from "../lib/lift";
import { prefersReducedMotion } from "../lib/motion";
import { site } from "../data/site";

// Signature intro: the name writes itself, then the sheet lifts away.
export function Loader() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const block = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const opts = { capture: true, passive: false };
    window.addEventListener("wheel", block, opts);
    window.addEventListener("touchmove", block, opts);
    const release = () => {
      window.removeEventListener("wheel", block, opts);
      window.removeEventListener("touchmove", block, opts);
    };
    const began = performance.now();
    const loaded =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
    const minimum = new Promise((resolve) =>
      window.setTimeout(resolve, Math.max(0, (reduced ? 500 : 1500) - (performance.now() - began))),
    );
    const cap = new Promise((resolve) => window.setTimeout(resolve, 3600));
    let cancelled = false;
    let hideTimer = 0;
    Promise.race([Promise.all([loaded, document.fonts.ready, minimum]), cap]).then(() => {
      if (cancelled) return;
      el.classList.add("loader--out");
      announceLift();
      release();
      hideTimer = window.setTimeout(() => {
        el.hidden = true;
      }, reduced ? 400 : 950);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(hideTimer);
      release();
    };
  }, []);

  return (
    <div ref={ref} data-loader="" className="loader" aria-hidden="true">
      <div className="loader__sheet">
        <div className="loader__mark">
          <p className="loader__name">{site.name}</p>
          <p className="loader__role">{site.role}</p>
        </div>
        <p className="loader__foot">Portfolio, {site.year}</p>
      </div>
    </div>
  );
}
