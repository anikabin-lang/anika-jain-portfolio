import { createRoot } from "react-dom/client";
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/the-nautigal/400.css";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "@fontsource/rozha-one/devanagari-400.css";
import "./styles/index.css";
import App from "./App";

// Not wrapped in StrictMode: the GSAP pins and the physics loop own real DOM
// state, and double-mounting them in development only adds noise.
createRoot(document.getElementById("root")).render(<App />);
