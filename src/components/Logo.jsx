// "ΛNIKΛ" wordmark — hairline geometric capitals with open, bar-less A's.
// Drawn as strokes so it stays crisp at every scale.
export function Logo({ width = 124, className = "", title }) {
  return (
    <svg
      className={`logo ${className}`}
      viewBox="0 0 124 24"
      width={width}
      height={(width * 24) / 124}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinejoin="miter"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d="M1 23 L11.5 1 L22 23" />
      <path d="M30.5 23 V1.4 L47.5 22.6 V1" />
      <path d="M57 1 V23" />
      <path d="M67 1 V23 M67 14.2 L81 1 M71.6 9.9 L82.5 23" />
      <path d="M90 23 L100.5 1 L111 23" />
    </svg>
  );
}
