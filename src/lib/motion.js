import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, CustomEase);

// The site-wide "glide" curve used by every scroll-scrubbed timeline.
export const GLIDE = "glide";
let glideReady = false;
export const registerGlide = () => {
  if (glideReady) return;
  glideReady = true;
  CustomEase.create(GLIDE, "0.25, 0.1, 0.75, 0.9");
};

// One unit of timeline time is worth 35% of the viewport height of scrolling.
export const scrollFor = (seconds) => Math.round(0.35 * window.innerHeight * seconds);

export const anticipatePin = () => +(ScrollTrigger.isTouch === 1);

let pending = 0;
export const remeasure = () => {
  if (pending) return;
  pending = requestAnimationFrame(() => {
    pending = 0;
    ScrollTrigger.refresh();
  });
};

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Deterministic PRNG so leaves and dust look the same on every visit.
export const mulberry = (seed) => {
  let s = seed >>> 0;
  return () => {
    let t = (s = (s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
};

export { gsap, ScrollTrigger };
