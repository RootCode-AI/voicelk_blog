import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import Portal from '../../components/Portal.jsx';
import { mediaUrl } from '../../lib/api.js';
import { videoEmbed } from '../../lib/embed.js';

export function ImageView({ url, alt, caption, width }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!zoomed) return undefined;
    const onKey = (e) => e.key === 'Escape' && setZoomed(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  if (!url) return null;
  const src = mediaUrl(url);

  return (
    <figure>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className={`block w-full cursor-zoom-in overflow-hidden bg-wash ${width === 'full' ? '' : 'rounded-xl border border-line shadow-card'}`}
        aria-label={`Enlarge image${alt ? `: ${alt}` : ''}`}
      >
        <img src={src} alt={alt ?? ''} loading="lazy" className="h-auto w-full" />
      </button>
      {caption && (
        <figcaption className={`mt-3 text-sm text-muted ${width === 'full' ? 'mx-auto max-w-[44rem] px-4' : ''}`}>
          {caption}
        </figcaption>
      )}

      <Portal>
        <AnimatePresence>
          {zoomed && (
            <motion.div
              className="fixed inset-0 z-[300] flex cursor-zoom-out items-center justify-center bg-paper/95 p-4 backdrop-blur-sm sm:p-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomed(false)}
              role="dialog"
              aria-modal="true"
              aria-label={alt || 'Image'}
            >
              <motion.img
                src={src}
                alt={alt ?? ''}
                className="max-h-full max-w-full rounded-lg shadow-soft"
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
              <button className="btn-icon absolute right-4 top-4" aria-label="Close">
                <X className="size-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </figure>
  );
}

export function VideoView({ url, caption }) {
  const embed = videoEmbed(url);
  if (!embed) return null;
  return (
    <figure>
      <div className="aspect-video overflow-hidden rounded-xl border border-line bg-ink shadow-card">
        {embed.kind === 'iframe' ? (
          <iframe
            src={embed.src}
            title={caption || 'Embedded video'}
            className="size-full"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <video src={mediaUrl(embed.src)} controls preload="metadata" className="size-full" />
        )}
      </div>
      {caption && <figcaption className="mt-3 text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}
