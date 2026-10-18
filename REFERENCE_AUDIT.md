# Reference audit — id-portfolio.website.biios.in

How the reference was studied: it was loaded in headless Chrome (Playwright) at 1440×900, 1280×800, 768×1024 and 390×844. Screenshots were taken every 600–700 px of scroll. The served HTML, the three CSS bundles and the client JS chunks were downloaded and read to get exact values: fonts, colours, timings, easings and scroll lengths.

**Stack found:** Next.js (Turbopack), Tailwind v4, GSAP 3 + ScrollTrigger + CustomEase, Lenis 1.3 (`lerp 0.12`, `wheelMultiplier 0.9`, driven by the GSAP ticker), React 19. No WebGL: everything is DOM, CSS 3D transforms and 2D canvas.

**Global tokens**

| Token | Value |
|---|---|
| paper / page bg | `#f4f1eb` (sections use `#f8f6f2`) |
| ink / soft / faint | `#1b1815` / `#5d564e` / `#726a60` |
| cobalt / deep | `#1c3a94` / `#142c74` |
| moss (status dot) | `#4a9f6e` |
| display serif | Newsreader (variable wght 200–800, roman + italic) |
| mono labels | DM Mono 400/500, uppercase, tracking .12–.2em |
| script | The Nautigal (cobalt, rotated −4°) |
| grotesk | Bricolage Grotesque (wght 200–800, wdth 75–100) |
| devanagari mark | Rozha One |
| grain | SVG fractal-noise data URI, 220px tiles, ~15% opacity |
| easing | "glide" CustomEase `0.25,0.1,0.75,0.9`; UI ease-out-expo `cubic-bezier(.16,1,.3,1)` |
| scroll unit | 1 timeline second = 0.35 × viewport height of scroll |

## 1. Loader
- Full-screen paper sheet with a soft top-left highlight and grain. The name in script writes on via `clip-path` (1.15s, delay .15s). An italic role line rises in (.9s), then "Portfolio, 2026" in Bricolage at the foot.
- It holds for at least 1.5s (and until fonts load, 3.6s at most), with wheel/touch scrolling blocked. Then the sheet slides up 100% (.95s `cubic-bezier(.76,0,.24,1)`) and announces "lifted".

## 2. Hero (`#top`)
- Fixed **wall** behind everything: radial wash, a skewed window-light "beam" of 4 blurred panes, a canvas **branch shadow** that sways in a shared breeze, and grain. The wall dims to 45% over the hero's scroll.
- 12-col grid, max 1680px, px 48 (lg). Copy sits in cols 1–6, vertically centred; the badge slot is cols 7–12.
- Copy: mono eyebrow "— PORTFOLIO / 2026"; h1 Newsreader light, `clamp(3.25rem,5.6vw,6rem)`, line-height .98, tracking −.03em. Lines: "Hello," / script "I'm Angel" (1.62em, cobalt) / italic role. Paragraph 19px/1.55, max 29rem. Cobalt pill CTA with a white knob (magnetic on hover; the knob rotates −45°), plus a text link with a wipe underline.
- Entrance (after the badge settles): fade header, lift eyebrow, rise lines (30px + 8px blur, 1.25s expo, 100ms stagger), sign clip-path (1.2s from .45s).
- On scroll (lg): the copy drifts up 72px and fades over 0.7 units; the scroll cue fades over 0.3 units.
- **Badge**: a 300×478u laminated pass on a woven lanyard, with real physics. The rope is a compliant one-sided constraint with a rigid card arm, bending modes, and damped yaw/pitch, drawn to canvas with a woven texture and a steel clasp. It drops in from above at 13° and settles. A cursor sweep flicks it, and the first scroll nudge pushes it. It has twin soft shadows, specular sheen, edge glints and floating dust.

## 3. Identity check (`#identity`, pinned)
- Pinned for `scrollFor(7.15)`. The badge slides to x≈30vw and the camera zooms 1.07. A frame with corner brackets and mono tags ("IDENTITY CHECK", "№ 0001", "READING/ALIGNING/VERIFIED", "000%") appears around it. The room dims; curved light lines and a sun wash fade in.
- A scanner beam (white line with a blue glow) sweeps top→bottom over 5 units. As it passes, six facts (2-col dl) draw a hairline rule, stroke their icon and rise in.
- The scan waits for the badge to settle on its mark (status reads "Aligning"), then catches up.
- Verdict: "● Identity *Verified.*", a statement, the CTA "Explore Selected Work ↓", and an ink **stamp** (noise-filtered SVG, text on a ring) that slams in from scale 1.55 / −16° and draws its tick.
- Exit: the panel lifts away, the badge returns to the hero column and then retracts up out of view (eased by power 1.7).
- Mobile: the frame centres on the badge and the panel sits below it, trimmed progressively ("cramped" levels) to fit.

## 4. Selected work (`#work`, pinned)
- Heading "Case studies / Selected *work*". A "room" of huge faint circles, per-project light gradients that crossfade, grain and drifting dust.
- **3D orbit**: cards on a ring (radius ≈0.7 card width), with perspective 2.3w. Back cards scale to 64%, blur up to 4px and fade. The floor is an SVG ellipse with 72 ticks and cobalt station dots; a mini orbit rail reads "Scroll to turn".
- Intro: cards fly in from z −520 while the stage scrolls into view. After that, scrolling 1.7 units turns one card. Clicking or focusing a neighbour glides the page to it. Hover tilts the front card ±3°, moves its gloss and spotlight, and parallaxes the copy and the etched mark. Idle: a breathing float.
- Card: 1.58:1 (wide) or 0.61 (tall mobile), radius ~3.4% of width, a gradient "plate" (stone, sage, cobalt or clay), and a giant etched word fitted to the card width. Content: title, category/year, a detail at the top right, a headline with an italic tail, the stack with slashes, and a "View project" pill with knob.

## 5. Process (`#process`)
- "Process / How I *work*". Four index-card sheets in a 4-column grid (2 at ≥640px, 1 on mobile). Each has a tab (First/Then/Next/Finally) whose position steps across the card, and paper tints stone/sage/mist/clay with grain.
- Scroll-linked (top 86% → 30%): each sheet swings from rotateY ±62° and z 170 about the row's centre, staggered .16 by column. A glint sweeps across it, shading fades, and the shadow shifts from far to near. Its words then rise with a rotateX(62°) flip. Hover lifts the sheet 6px.

## 6. Contact (pinned)
- The backdrop crossfades to a sunlit room: rays, a sun wash, curved lines and a second branch shadow at the top right.
- The badge lowers back in at the centre, zooms to about 62% of the viewport height, and **flips** to its back (a spring-damped turn, showing the edge thickness mid-turn). The back holds mono-labelled contact rows (email copy-to-clipboard with "Copied ✓", GitHub, LinkedIn, resume download with "Downloading…") and a QR plate that scales on click.
- The rows stagger in with blur. Then the words: "Let's Build Something *Beautiful.*" with a hand-drawn swelling underline (masked stroke), the invitation, and a mono sign-off.
- The camera "breathes" slightly. Hovering email or LinkedIn sweeps a glance of light; GitHub deepens the shadow.

## 7. Responsive
- <1024: a single column, badge on top. The slot is `clamp(340px,52svh,520px)` (md `clamp(480px,60svh,760px)`) and the badge is centred. The copy is no longer scrubbed on scroll.
- The work stage switches to the tall card shape below 720px. The process grid goes 1 → 2 → 4 columns. Header px 24 → 40 → 48.
- Reduced motion: no smooth scroll, no physics (the badge simply hangs), and reveals are opacity-only.

## Required techniques (implementation checklist)
- [x] GSAP + ScrollTrigger pins, scroll-time mapping and CustomEase "glide"
- [x] Lenis smooth scroll on the GSAP ticker; scroll restoration through pin-spacers
- [x] Badge lanyard physics plus canvas rope, dust and foliage
- [x] Identity scan timeline with the align → read → verify states
- [x] 3D orbit carousel with floor projection, depth blur and hover tilt
- [x] Process sheet swing and rising words
- [x] Contact badge lower and flip, clipboard copy, underline pen
- [x] Loader signature intro
- [x] Same font families (self-hosted via Fontsource) and the same colour tokens
