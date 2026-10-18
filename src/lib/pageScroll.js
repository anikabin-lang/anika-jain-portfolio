// Thin wrapper around the page's Lenis instance so sections can glide to a
// scroll position without importing Lenis themselves.
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const pageScroll = {
  lenis: null,
  travelling: false,
  attach(lenis) {
    this.lenis = lenis;
  },
  detach(lenis) {
    if (this.lenis === lenis) this.lenis = null;
  },
  glide(y) {
    if (this.lenis) this.lenis.scrollTo(y, { duration: 1.4, easing: easeInOut });
    else window.scrollTo({ top: y, behavior: "smooth" });
  },
};
