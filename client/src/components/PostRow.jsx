import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from './motion/Reveal.jsx';
import { mediaUrl } from '../lib/api.js';
import { formatDate } from '../lib/format.js';
import { imageAlt } from '../../../shared/images.js';

// Posts without a cover image get a typographic one instead of a stock photo.
export function CoverArt({ post, className = '' }) {
  if (post.coverImage?.url) {
    return (
      <img
        src={mediaUrl(post.coverImage.url)}
        alt={imageAlt(post.coverImage.alt, `Cover for ${post.title}`)}
        loading="lazy"
        className={`size-full object-cover ${className}`}
      />
    );
  }
  const seed = [...(post.slug ?? post.title ?? '')].reduce((n, c) => n + c.charCodeAt(0), 0);
  return (
    <div className={`relative flex size-full items-end overflow-hidden bg-wash p-6 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="absolute inset-x-0 top-1/2 h-1/2 w-full -translate-y-1/2 opacity-40">
        {Array.from({ length: 40 }, (_, i) => {
          const h = 6 + Math.abs(Math.sin((i + seed) * 0.9) * Math.cos(i * 0.31)) * 48;
          return <rect key={i} x={i * 5 + 1} y={30 - h / 2} width="2.4" height={h} rx="1.2" fill="#373a46" />;
        })}
      </svg>
      <span className="relative font-serif text-2xl italic text-slate">{post.tags?.[0] ?? 'research note'}</span>
    </div>
  );
}

export function PostMeta({ post }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{post.readingMinutes} min read</span>
    </p>
  );
}

// One zig-zag row: odd rows put the image on the right.
export default function PostRow({ post, index = 0, large = false }) {
  const flip = index % 2 === 1;
  return (
    <Reveal as="article" className="group">
      <Link
        to={`/blog/${post.slug}`}
        className={`grid items-center gap-6 md:gap-12 ${large ? 'md:grid-cols-[1.25fr_1fr]' : 'md:grid-cols-[1fr_1.1fr]'}`}
      >
        <motion.div
          whileHover={{ scale: 1.015 }}
          transition={{ duration: 0.2 }}
          className={`aspect-[16/10] overflow-hidden rounded-xl border border-line shadow-card ${flip ? 'md:order-2' : ''}`}
        >
          <CoverArt post={post} className="transition-transform duration-700 group-hover:scale-[1.03]" />
        </motion.div>
        <div className={flip ? 'md:order-1' : ''}>
          {post.tags?.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((t) => (
                <li key={t} className="eyebrow">
                  {t}
                </li>
              ))}
            </ul>
          )}
          <h3
            className={`font-serif leading-[1.08] tracking-[-0.01em] text-ink ${
              large ? 'text-[clamp(2rem,4vw,3rem)]' : 'text-[clamp(1.6rem,3vw,2.25rem)]'
            }`}
          >
            {post.title}
          </h3>
          {post.excerpt && <p className="mt-4 max-w-prose leading-relaxed text-slate">{post.excerpt}</p>}
          <div className="mt-5 flex items-center justify-between gap-4">
            <PostMeta post={post} />
            <ArrowUpRight className="size-5 text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

export function PostRowSkeleton() {
  return (
    <div className="grid items-center gap-6 md:grid-cols-[1fr_1.1fr] md:gap-12">
      <div className="skeleton aspect-[16/10] rounded-xl" />
      <div className="space-y-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-9 w-4/5" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
      </div>
    </div>
  );
}
