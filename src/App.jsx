import { Loader } from "./components/Loader";
import { SmoothScroll } from "./components/SmoothScroll";
import { Hero } from "./components/Hero";
import { Identity } from "./components/Identity";
import { Work } from "./components/Work";
import { Process } from "./components/Process";
import { Record } from "./components/Record";
import { Contact } from "./components/Contact";

export default function App() {
  return (
    <>
      <Loader />
      <SmoothScroll />
      <main>
        <Hero />
        <Identity />
        <Work />
        <Process />
        <Record />
        <Contact />
      </main>
    </>
  );
}
