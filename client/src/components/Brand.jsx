// The VoiceLK logo, drawn so its sound bars can speak.
//
// The book and the wordmark are images cut from assets/brand/voicelk-logo.png by
// scripts/build-brand-assets.js; the five bars are drawn here instead, at the same
// coordinates (source pixels, measured from the mark's top-left corner), so CSS can
// animate them. At rest it has the original logo's exact shapes, drawn in the site's
// ink black; the full-colour logo is kept for email, the social card and the icons.

const MARK = { width: 644, height: 381 };
// The site's ink (--color-ink in index.css); the book and wordmark images are
// generated in the same colour by scripts/build-brand-assets.js.
const INK = '#1a1a1a';
const WORDMARK = { x: 673, y: 87, width: 1257, height: 254 };
const BARS = [
  { x: 218, y: 84, width: 26, height: 47 },
  { x: 260, y: 44, width: 36, height: 126 },
  { x: 312, y: 0, width: 39, height: 217 },
  { x: 366, y: 45, width: 30, height: 123 },
  { x: 410, y: 84, width: 25, height: 47 },
];
// Uneven timings make the bars read as speech rather than a metronome.
const SPEECH = [
  { low: 0.45, duration: '0.42s', delay: '0.06s' },
  { low: 0.38, duration: '0.5s', delay: '0.18s' },
  { low: 0.55, duration: '0.36s', delay: '0s' },
  { low: 0.34, duration: '0.46s', delay: '0.24s' },
  { low: 0.5, duration: '0.4s', delay: '0.12s' },
];
const BARS_BOX = { x: 218, width: 217, height: 217 };

/**
 * voice: 'idle' (the logo as drawn), 'intro' (says a few syllables, then rests),
 * 'speaking' (keeps going, for loading and playback) or 'silent' (bars flattened).
 * Inside an element with the `group` class, hovering or focusing it also speaks.
 * book={false} draws the bars alone.
 */
export function BrandMark({ voice = 'idle', wordmark = false, book = true, className = '' }) {
  const viewBox = !book
    ? `${BARS_BOX.x} 0 ${BARS_BOX.width} ${BARS_BOX.height}`
    : `0 0 ${wordmark ? WORDMARK.x + WORDMARK.width : MARK.width} ${MARK.height}`;
  const [, , width, height] = viewBox.split(' ').map(Number);

  return (
    <svg
      viewBox={viewBox}
      className={`brand-mark ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
      data-voice={voice}
      aria-hidden="true"
      focusable="false"
    >
      {book && <image href="/brand/voicelk-book.webp" width={MARK.width} height={MARK.height} />}
      {BARS.map((bar, i) => (
        <rect
          key={bar.x}
          className="brand-bar"
          x={bar.x}
          y={bar.y}
          width={bar.width}
          height={bar.height}
          rx={bar.width / 2}
          fill={INK}
          style={{
            '--speak-low': SPEECH[i].low,
            '--speak-duration': SPEECH[i].duration,
            '--speak-delay': SPEECH[i].delay,
            '--silent-scale': bar.width / bar.height,
          }}
        />
      ))}
      {wordmark && book && <image href="/brand/voicelk-wordmark.webp" {...WORDMARK} />}
    </svg>
  );
}

// Page-level loading state: the mark keeps talking until the content arrives.
export function BrandLoader({ label = 'Loading', className = 'min-h-[60dvh]' }) {
  return (
    <div className={`grid place-items-center ${className}`} role="status">
      <BrandMark voice="speaking" className="h-12 w-auto" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
