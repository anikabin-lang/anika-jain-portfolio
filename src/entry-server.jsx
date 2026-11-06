// Build-time only: scripts/prerender.mjs uses this to render the page to
// static HTML for search engines. Not part of the client bundle.
import { renderToString } from "react-dom/server";
import App from "./App";

export { site, projects, skills, education, awards } from "./data/site";

export function render() {
  return renderToString(<App />);
}
