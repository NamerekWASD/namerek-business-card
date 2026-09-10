// The line icons the flat card's controls carry. Drawn rather than fetched:
// they are four paths, and a webfont or a sprite would be a network request
// and a licence for that.
//
// `currentColor` throughout, so an icon takes the colour of the control it
// sits in — including its hover and its disabled state — without a rule of
// its own.

const ICON_PROPS = { width: 18, height: 18, viewBox: '0 0 18 18', fill: 'none', 'aria-hidden': 'true' };

export function EmailIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="1.5" y="3.5" width="15" height="11" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 4.5 L9 10 L16 4.5" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

export function LinkedinIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="1.5" y="1.5" width="15" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.3" cy="5.3" r="1.1" fill="currentColor" />
      <path d="M5.3 7.9 V13" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.6 13 V9.8 C8.6 8 11.4 8 11.4 9.8 V13" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

export function GithubIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path
        d="M9 1.6c-4.1 0-7.4 3.3-7.4 7.4 0 3.3 2.1 6.1 5.1 7.1.4.1.5-.2.5-.4v-1.5c-2.1.4-2.5-1-2.5-1-.3-.8-.8-1.1-.8-1.1-.7-.5.1-.5.1-.5.7.1 1.1.7 1.1.7.7 1.2 1.8.8 2.2.6.1-.5.3-.8.5-1-1.7-.2-3.5-.9-3.5-3.8 0-.8.3-1.5.7-2-.1-.2-.3-1 .1-2.1 0 0 .6-.2 2 .8a6.8 6.8 0 0 1 3.6 0c1.4-1 2-.8 2-.8.4 1.1.2 1.9.1 2.1.5.5.7 1.2.7 2 0 2.9-1.8 3.6-3.5 3.8.3.2.5.7.5 1.5v2.2c0 .2.1.5.6.4 3-1 5.1-3.8 5.1-7.1 0-4.1-3.3-7.4-7.4-7.4Z"
        stroke="currentColor"
        strokeWidth="0.4"
        fill="currentColor"
      />
    </svg>
  );
}

/** A link that leaves the site, for a destination that is nobody's known mark. */
export function ExternalIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M14.5 10.2 V14 A1.5 1.5 0 0 1 13 15.5 H4 A1.5 1.5 0 0 1 2.5 14 V5 A1.5 1.5 0 0 1 4 3.5 H7.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.6 2.5 H15.5 V7.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      <path d="M15.5 2.5 L8.4 9.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/**
 * The mark for an address, where its host has one. A project's link is usually
 * its repository and sometimes the thing itself running somewhere, and which
 * of those a visitor is about to leave for is worth saying before the press.
 */
export function AddressIcon({ href }) {
  let host = '';
  try {
    host = new URL(href, 'https://example.invalid').hostname;
  } catch {
    host = '';
  }
  return host === 'github.com' || host.endsWith('.github.com') ? <GithubIcon /> : <ExternalIcon />;
}
