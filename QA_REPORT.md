# QA report

All checks were run in headless Chrome (Playwright) against the local dev server (`npm run dev`) and the live reference, at the same viewport sizes.

## Visual comparison
| Check | Result |
|---|---|
| First viewport 1440×900: element boxes vs reference | h1 `[48,251,660,270]`, signature, paragraph `[48,561,464,88]`, CTA `[48,698,212,52]` and badge `[902,174,312,494]` are **identical** to the reference (±1px) |
| First viewport 1280×800 | Identical boxes (h1 `[48,216,580,240]`, badge `[800,155,278,439]`) |
| 768 tablet hero | Same badge position and size; the paragraph is 3 lines vs 2 (longer copy) |
| Pixel diff (threshold 40) | 4.8% of pixels at 1440 and 4.9% at 1280. The remaining differences are content: name, monogram vs photo, copy |
| Full scroll, 1440 / 768 / 390 | Contact sheets compared frame by frame: loader, hero, identity check, orbit, process, contact. Section order, pin lengths and transitions match |
| Mobile 390×844 | Badge above the copy, scan frame centred, facts below, tall orbit cards, 1-column process, centred contact flip, as in the reference |

## Fixes made during QA
1. The hero closing line broke as "full-/stack" over four lines. Changed it to "an AI/ML developer." (603px, fits the 660px column) to restore the reference's three-line composition. "Full-stack" stays in the intro, badge, loader and title.
2. The identity Education value wrapped an orphaned "AI". Shortened it to "B.Tech CSE (DS & AI)".
3. In the resume education rows, the location and CGPA ran together on desktop. They are now stacked and right-aligned.
4. "№" rendered in SF Mono (tiny). Added the reference's Arial metric fallback for DM Mono.
5. Project-card links were not keyboard-reachable while the cards were off-screen (`visibility:hidden`). Off-screen cards now use opacity 0, and focusing a card link glides the ring to that card.

## Motion / robustness
- Fast wheel scrolling (60×400px), jumping to the bottom and back to the top, wheeling up from contact into the identity check, and re-entering the identity check all behave correctly. The badge returns to the hero, re-pins and re-flips, with no stuck states.
- Resize 1440 → 390 → 1440 mid-page: the layout re-measures. During the ~1s debounce the identity panel briefly shows its old position; the reference does exactly the same and settles at the same 471px.
- No horizontal overflow at 1440 or 390 (`scrollWidth − innerWidth = 0`).
- `prefers-reduced-motion`: Lenis, physics and the scrubbed motion turn off, and reveals become opacity-only (logic ported from the reference).

## Functional
| Check | Result |
|---|---|
| Console errors / warnings / failed requests | **None** across all runs |
| Email on the badge back | Click copies `anika.bin@gmail.com` (clipboard read back). It shows "Copied ✓" and the live region says "Email address copied." only after the write succeeds; otherwise it falls back to `mailto:` |
| Resume download | Downloads `Anika-Jain-Resume.pdf`, 126,028 bytes, the same file as the supplied PDF |
| QR codes (decoded from rendered screenshots with jsQR) | Front → `https://github.com/anikabin-lang`; back → `mailto:anika.bin@gmail.com` |
| QR click toggle | `data-open=true`, plate scales |
| Phone | `tel:+919753702530` |
| External links (HTTP) | GitHub profile and all 3 repos: 200. Jaldrishti demo: 200. Both certificates (Drive): 200. LinkedIn: 999, which is LinkedIn's anti-bot answer to automated requests, so it couldn't be verified from here; the URL is exactly the one supplied |
| External link attributes | All `target="_blank" rel="noopener noreferrer"`; no `href="#"` anywhere |
| Keyboard | Header → hero CTAs → cards → certificates → the contact list. Focus on the hidden contact list is mirrored onto the badge, which turns fully |
| `npm run build` | Passes |

## Known limitations / decisions
- **Portrait:** built from `Anika.jpeg` by `scripts/make-portrait.py`. It is cropped to head and shoulders, with a lens-style focus falloff, the yellow panels muted and a warm neutral grade, and output to `public/images/anika-portrait.jpg` (960×832). The source face is only ~100px wide, so it is slightly soft at large sizes; a higher-resolution photo would be sharper. The logo is a drawn "ΛNIKΛ" wordmark.
- **Project visuals:** the reference cards use no images, only material plates with a giant etched word. The cards follow that pattern (जलदृष्टि / DRISHTI / back2u). No screenshots were invented.
- **Badge status pill** reads "Open to opportunities". This is not from the resume; edit `site.availability` in `src/data/site.js`.
- **External links open in a new tab.** The reference fades the page and navigates in the same tab; that was dropped because a delayed new-tab open would be blocked as a popup.
- **QR "Scan to email"** points to `mailto:` until a deployed portfolio URL exists. Change it in `scripts/make-qr.mjs` and run `node scripts/make-qr.mjs`.
