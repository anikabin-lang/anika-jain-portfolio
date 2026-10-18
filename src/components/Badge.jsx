import { site } from "../data/site";
import { frontQR, backQR } from "../data/qr";
import { Logo } from "./Logo";

const QR = ({ code, className }) => (
  <svg className={className} viewBox={`0 0 ${code.size} ${code.size}`} shapeRendering="crispEdges" aria-hidden="true">
    <path d={code.d} fill="currentColor" />
  </svg>
);

// Six-dot braille cells spelling "anika" (a, n, i, k, a).
const BRAILLE = [
  [1, 0, 0, 0, 0, 0],
  [1, 0, 1, 1, 1, 0],
  [0, 1, 0, 1, 0, 0],
  [1, 0, 1, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
];

const LinkIcon = ({ kind }) => {
  if (kind === "email")
    return (
      <svg className="badge__link-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M6 6V3.5h6.5V10H10M3.5 6H10v6.5H3.5Z" />
      </svg>
    );
  if (kind === "resume")
    return (
      <svg className="badge__link-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path className="badge__link-arrow" d="M8 2.5v7.5M5 7.2 8 10.2l3-3" />
        <path d="M3.5 13.2h9" />
      </svg>
    );
  if (kind === "phone")
    return (
      <svg className="badge__link-icon" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M5.2 2.8 6.9 5c.3.4.2.9-.1 1.2l-.9.8a7.4 7.4 0 0 0 3.1 3.1l.8-.9c.3-.3.8-.4 1.2-.1l2.2 1.7c.4.3.4.9.1 1.3l-.9.9c-.6.6-1.5.8-2.3.5A10.7 10.7 0 0 1 2.5 6c-.3-.8-.1-1.7.5-2.3l.9-.9c.4-.3 1-.3 1.3 0Z" />
      </svg>
    );
  return (
    <svg className="badge__link-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.5 11.5l7-7M6 4.5h5.5V10" />
    </svg>
  );
};

// The studio pass. The front is the hero identity; the back (shown once the
// card flips in the contact section) carries real, clickable contact links.
export function Badge() {
  const { contact } = site;
  return (
    <div className="badge" data-badge="">
      <div
        className="badge__slab"
        role="img"
        aria-label={`${site.fullName}’s student pass. ${site.role}. ${site.availability.label}.`}
      />
      <div className="badge__frost" />
      <div className="badge__slot" />
      <div className="badge__head">
        <Logo className="badge__logo" />
        <svg className="badge__nfc" viewBox="4 2.5 13 19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M5.83 8.79A5 5 0 0 1 5.83 15.21" />
          <path d="M8.89 6.21A9 9 0 0 1 8.89 17.79" />
          <path d="M11.96 3.64A13 13 0 0 1 11.96 20.36" />
        </svg>
      </div>
      <div className="badge__photo">
        <img
          className="badge__portrait"
          data-badge-portrait=""
          src={site.portrait.src}
          alt=""
          width={site.portrait.width}
          height={site.portrait.height}
          draggable="false"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="badge__info" aria-hidden="true">
        <div>
          <p className="badge__name">{site.fullName}</p>
          <p className="badge__role">{site.roleShort}</p>
        </div>
        <QR code={frontQR} className="badge__qr" />
      </div>
      <div className="badge__rule" />
      <div className="badge__foot" aria-hidden="true">
        <span className="badge__status">
          <span className="badge__dot" data-open={String(site.availability.open)} />
          {site.availability.label}
        </span>
        <span className="badge__serial">№ {site.badge.serial}</span>
      </div>
      <div className="badge__base" aria-hidden="true">
        <span className="badge__micro">
          {site.badge.pass} — {site.badge.edition}
        </span>
        <span className="badge__braille">
          {BRAILLE.map((cell, i) => (
            <span key={i} className="badge__cell">
              {cell.map((on, j) => (
                <span key={j} className={on ? "badge__bump" : undefined} />
              ))}
            </span>
          ))}
        </span>
      </div>

      <div className="badge__back" data-badge-back="" aria-hidden="true">
        <div className="badge__back-head">
          <span>Contact</span>
          <i />
          <span>№ {site.badge.serial}</span>
        </div>
        <p className="badge__back-name">{site.fullName}</p>
        <p className="badge__back-role">{site.role}</p>
        <div className="badge__links">
          <a className="badge__link" data-contact="email" href={`mailto:${site.email}`} tabIndex={-1} draggable="false">
            <span className="badge__link-label">Email</span>
            <span className="badge__link-value">
              <span className="badge__link-text">{site.email}</span>
              <span className="badge__link-note">Copied ✓</span>
            </span>
            <LinkIcon kind="email" />
          </a>
          <a className="badge__link" data-contact="phone" href={site.phone.href} tabIndex={-1} draggable="false">
            <span className="badge__link-label">Phone</span>
            <span className="badge__link-value">
              <span className="badge__link-text">{site.phone.label}</span>
            </span>
            <LinkIcon kind="phone" />
          </a>
          <a className="badge__link" data-contact="github" href={contact.github.href} target="_blank" rel="noopener noreferrer" tabIndex={-1} draggable="false">
            <span className="badge__link-label">GitHub</span>
            <span className="badge__link-value">
              <span className="badge__link-text">{contact.github.label}</span>
            </span>
            <LinkIcon kind="out" />
          </a>
          <a className="badge__link" data-contact="linkedin" href={contact.linkedin.href} target="_blank" rel="noopener noreferrer" tabIndex={-1} draggable="false">
            <span className="badge__link-label">LinkedIn</span>
            <span className="badge__link-value">
              <span className="badge__link-text">{contact.linkedin.label}</span>
            </span>
            <LinkIcon kind="out" />
          </a>
          <a className="badge__link" data-contact="resume" href={contact.resume.href} download={contact.resume.file} tabIndex={-1} draggable="false">
            <span className="badge__link-label">Resume</span>
            <span className="badge__link-value">
              <span className="badge__link-text">{contact.resume.label}</span>
              <span className="badge__link-note">Downloading…</span>
            </span>
            <LinkIcon kind="resume" />
          </a>
        </div>
        <button type="button" className="badge__scan" data-contact="qr" tabIndex={-1}>
          <span className="badge__scan-plate">
            <QR code={backQR} />
          </span>
          <span className="badge__scan-copy">
            <span className="badge__link-label">QR code</span>
            <span className="badge__scan-line">Scan to visit</span>
          </span>
        </button>
      </div>
      <div className="badge__shade" data-badge-shade="" />
      <div className="badge__gloss">
        <div className="badge__window" data-badge-window="" />
        <div className="badge__sheen" data-badge-sheen="" />
        <div className="badge__glance" data-badge-glance="" />
      </div>
      <div className="badge__glint badge__glint--left" data-badge-glint-left="" />
      <div className="badge__glint badge__glint--right" data-badge-glint-right="" />
    </div>
  );
}
