// Runs after `vite build` + the SSR build (see package.json "build").
// Renders the app to static HTML and writes it into dist/index.html so
// search engines and link-preview bots get the full content without running
// JavaScript, then adds JSON-LD structured data built from src/data/site.js.
// The client still mounts with createRoot, which replaces this markup.
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const ssrEntry = new URL("../dist-ssr/entry-server.js", import.meta.url);
const htmlPath = `${root}dist/index.html`;

const { render, site, projects, skills, education, awards } = await import(ssrEntry.href);

const URL_BASE = "https://anikajain.runs-on.dev/";
const abs = (path) => new URL(path, URL_BASE).href;

const person = {
  "@type": "Person",
  "@id": `${URL_BASE}#person`,
  name: site.fullName,
  givenName: "Anika",
  familyName: "Jain",
  url: URL_BASE,
  image: abs(site.portrait.src),
  jobTitle: site.role,
  description: site.description,
  email: `mailto:${site.email}`,
  address: { "@type": "PostalAddress", addressLocality: "Noida", addressRegion: "Uttar Pradesh", addressCountry: "IN" },
  alumniOf: [...new Set(education.map((e) => e.school))].map((name) => ({ "@type": "EducationalOrganization", name })),
  knowsAbout: [...new Set(skills.flatMap((g) => g.items))],
  award: awards.map((a) => `${a.tag} — ${a.title}`),
  sameAs: [site.contact.github.href, site.contact.linkedin.href.split("?")[0]],
};

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    person,
    {
      "@type": "WebSite",
      "@id": `${URL_BASE}#website`,
      url: URL_BASE,
      name: site.fullName,
      inLanguage: "en",
      publisher: { "@id": `${URL_BASE}#person` },
    },
    {
      "@type": "ProfilePage",
      "@id": `${URL_BASE}#profile`,
      url: URL_BASE,
      name: `${site.fullName} — ${site.role}`,
      isPartOf: { "@id": `${URL_BASE}#website` },
      mainEntity: { "@id": `${URL_BASE}#person` },
      dateModified: new Date().toISOString().slice(0, 10),
    },
    ...projects.map((p) => ({
      "@type": "CreativeWork",
      name: p.name,
      description: p.summary,
      genre: p.category,
      keywords: p.stack.join(", "),
      creator: { "@id": `${URL_BASE}#person` },
      url: (p.links.find((l) => l.primary) ?? p.links[0]).href,
    })),
  ],
};

// "</" inside a JSON string would close the <script> tag early.
const jsonLd = JSON.stringify(graph).replace(/</g, "\\u003c");

let html = await readFile(htmlPath, "utf8");
if (!html.includes('<div id="root"></div>')) throw new Error("prerender: #root placeholder not found");
html = html
  .replace('<div id="root"></div>', `<div id="root">${render()}</div>`)
  .replace("</head>", `  <script type="application/ld+json">${jsonLd}</script>\n  </head>`);

await writeFile(htmlPath, html);
await rm(`${root}dist-ssr`, { recursive: true, force: true });
console.log(`prerender: wrote ${htmlPath} (${(html.length / 1024).toFixed(1)} kB)`);
