import { motion } from 'motion/react';
import BlockRenderer, { withHeadingIds } from '../blocks/BlockRenderer.jsx';
import { fadeUp, stagger } from './motion/Reveal.jsx';
import { PostMeta } from './PostRow.jsx';
import { mediaUrl } from '../lib/api.js';
import { imageAlt } from '../../../shared/images.js';

function Contents({ blocks, onJump }) {
  const headings = withHeadingIds(blocks).filter((b) => b.type === 'heading' && b.data.text && b.data.level <= 3);
  if (headings.length < 3) return null;
  return (
    <nav aria-label="Contents" className="rounded-xl border border-line bg-white p-5">
      <p className="eyebrow mb-3">In this note</p>
      <ol className="space-y-1.5 text-[15px]">
        {headings.map((h) => (
          <li key={h.id} className={h.data.level === 3 ? 'pl-4' : ''}>
            <a
              href={`#${h.anchor}`}
              onClick={(e) => {
                if (!onJump) return;
                e.preventDefault();
                onJump(h.anchor);
              }}
              className="text-slate transition-colors hover:text-ink"
            >
              {h.data.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// The full article: header, cover, contents and body. Used by the public post
// page and by the editor's preview, so the preview is exactly what readers see.
export default function PostArticle({ post, onJump, animate = true }) {
  return (
    <article>
      <motion.header
        initial={animate ? 'hidden' : false}
        animate="show"
        variants={stagger()}
        className="mx-auto max-w-[52rem] px-4 text-center"
      >
        {post.tags?.length > 0 && (
          <motion.ul variants={fadeUp} className="mb-6 flex flex-wrap justify-center gap-3">
            {post.tags.map((t) => (
              <li key={t} className="eyebrow">
                {t}
              </li>
            ))}
          </motion.ul>
        )}
        <motion.h1
          variants={fadeUp}
          className="font-serif text-[clamp(2.6rem,6.5vw,4.75rem)] leading-[1] tracking-[-0.02em] text-ink"
        >
          {post.title || 'Untitled note'}
        </motion.h1>
        {post.excerpt && (
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate">
            {post.excerpt}
          </motion.p>
        )}
        <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center justify-center gap-x-3 text-sm text-muted">
          {post.author && (
            <>
              <span className="text-ink">{post.author}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <PostMeta post={{ ...post, publishedAt: post.publishedAt ?? new Date().toISOString() }} />
        </motion.div>
      </motion.header>

      {post.coverImage?.url && (
        <motion.div
          initial={animate ? { opacity: 0, y: 24 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-14 w-[min(67.5rem,calc(100%-2rem))] overflow-hidden rounded-2xl border border-line shadow-card"
        >
          <img src={mediaUrl(post.coverImage.url)} alt={imageAlt(post.coverImage.alt, `Cover for ${post.title}`)} className="max-h-[36rem] w-full object-cover" />
        </motion.div>
      )}

      <div className="mt-14 space-y-10">
        <div className="mx-auto w-[min(44rem,calc(100%-2rem))]">
          <Contents blocks={post.blocks ?? []} onJump={onJump} />
        </div>
        <BlockRenderer blocks={post.blocks ?? []} animate={animate} />
      </div>
    </article>
  );
}
