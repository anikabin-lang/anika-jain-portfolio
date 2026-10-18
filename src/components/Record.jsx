import { useRef } from "react";
import { awards, education, skills, certifications, campus, learning } from "../data/site";
import { useRisingWords } from "./Process";

const Slashed = ({ items, className = "record__slashed" }) => (
  <p className={className}>
    {items.map((item, i) => (
      <span key={item + i}>
        {i > 0 && (
          <>
            <span aria-hidden="true" className="record__slash">
              /
            </span>
            <span className="sr-only">, </span>
          </>
        )}
        {item}
      </span>
    ))}
  </p>
);

function Block({ index, label, id, children }) {
  return (
    <section className="record__block" aria-labelledby={id}>
      <h3 id={id} className="record__label" data-rise-group="">
        <span data-words="" className="record__index">
          {String(index).padStart(2, "0")}
        </span>
        <span data-words="">{label}</span>
      </h3>
      <div className="record__body">{children}</div>
    </section>
  );
}

// Education, skills, awards, certifications and campus life — the resume,
// set in the same editorial type as the identity read-out.
export function Record() {
  const ref = useRef(null);
  useRisingWords(ref);

  return (
    <section ref={ref} id="record" aria-labelledby="record-title" className="record">
      <header className="record__head" data-rise-group="">
        <p data-words="" className="record__eyebrow">
          Resume
        </p>
        <h2 data-words="" id="record-title" className="record__title">
          On the <em>record</em>
        </h2>
      </header>

      <div className="record__blocks">
        <Block index={1} label="Awards" id="record-awards">
          <ul className="record__awards">
            {awards.map((a) => (
              <li key={a.title} className="record__award" data-rise-group="">
                <p data-words="" className="record__tag">
                  <i className="record__seal" aria-hidden="true" />
                  {a.tag}
                </p>
                <h4 data-words="" className="record__award-title">
                  {a.title}
                </h4>
                <p data-words="" className="record__text">
                  {a.text}
                </p>
                <p data-words="" className="record__meta">
                  {a.meta.join(" · ")}
                </p>
                <a
                  data-words=""
                  className="record__cta"
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${a.title} certificate (opens in a new tab)`}
                >
                  View certificate <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </Block>

        <Block index={2} label="Education" id="record-education">
          <ol className="record__rows">
            {education.map((e) => (
              <li key={e.award} className="record__row record__row--edu" data-rise-group="">
                <p data-words="" className="record__when">
                  {e.years}
                </p>
                <div data-words="">
                  <p className="record__name">{e.school}</p>
                  <p className="record__sub">
                    {e.award} — {e.detail}
                  </p>
                </div>
                <p data-words="" className="record__aside">
                  <span>{e.place}</span>
                  {e.score && <strong>{e.score}</strong>}
                </p>
              </li>
            ))}
          </ol>
        </Block>

        <Block index={3} label="Technical skills" id="record-skills">
          <dl className="record__skills">
            {skills.map((s) => (
              <div key={s.group} className="record__skill" data-rise-group="">
                <dt data-words="">{s.group}</dt>
                <dd data-words="">
                  <Slashed items={s.items} />
                </dd>
              </div>
            ))}
          </dl>
        </Block>

        <Block index={4} label="Certifications & workshops" id="record-certs">
          <ul className="record__certs">
            {certifications.map((c) => (
              <li key={c.name} className="record__cert" data-rise-group="">
                <p data-words="" className="record__cert-name">
                  {c.name}
                </p>
                <p data-words="" className="record__meta">
                  {[c.by, c.note, c.when].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </Block>

        <Block index={5} label="Campus & learning" id="record-campus">
          <div className="record__split">
            <ul className="record__rows">
              {campus.map((c) => (
                <li key={c.org} className="record__row record__row--campus" data-rise-group="">
                  <p data-words="" className="record__when">
                    {c.role}
                  </p>
                  <div data-words="">
                    <p className="record__name record__name--sm">
                      {c.org}
                      {c.when && <span className="record__note"> · {c.when}</span>}
                    </p>
                    <p className="record__sub">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="record__learning" data-rise-group="">
              <p data-words="" className="record__kicker">
                Ongoing learning
              </p>
              <ul>
                {learning.map((l) => (
                  <li key={l.name} data-words="" className="record__course">
                    <span className="record__name record__name--sm">{l.name}</span>
                    <span className="record__meta">{l.by}</span>
                    <span className="record__status">
                      <i className="record__dot" aria-hidden="true" />
                      {l.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Block>
      </div>
    </section>
  );
}
