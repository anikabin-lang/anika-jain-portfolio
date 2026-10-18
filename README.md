# Anika Jain — Portfolio

Personal portfolio of Anika Jain (B.Tech CSE, Data Science & AI). Built with Vite, React 19, Tailwind CSS v4, GSAP (ScrollTrigger) and Lenis.

## Develop

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build
```

Requires Node 20.19+ or 22.12+.

## Content

All text, projects, links and resume details live in `src/data/site.js`.

- Resume PDF: `public/files/anika-jain-resume.pdf`
- Badge photo: `public/images/anika-portrait.jpg`, generated from a local `Anika.jpeg` by `python3 scripts/make-portrait.py` (the original photo is not committed)
- QR codes: `node scripts/make-qr.mjs` regenerates `src/data/qr.js`

## Deploy (Vercel)

`vercel.json` pins the settings: framework **Vite**, install `npm ci`, build `npm run build`, output `dist`. No environment variables are needed.
