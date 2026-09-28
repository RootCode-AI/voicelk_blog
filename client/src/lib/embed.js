// Turns a YouTube or Vimeo link into an embeddable player URL. Anything else is
// treated as a direct video file.
export function videoEmbed(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url, window.location.origin);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = parsed.searchParams.get('v') ?? parsed.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
    return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.match(/(\d+)/)?.[1];
    return id ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` } : null;
  }
  return { kind: 'file', src: url };
}
