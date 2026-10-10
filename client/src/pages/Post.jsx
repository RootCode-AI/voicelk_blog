import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { motion, useScroll, useSpring } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Link2 } from 'lucide-react';
import NewsletterForm from '../components/NewsletterForm.jsx';
import Portal from '../components/Portal.jsx';
import PostArticle from '../components/PostArticle.jsx';
import Seo from '../components/Seo.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';
import { useSmoothScroll } from '../components/motion/SmoothScroll.jsx';
import { useApi } from '../hooks/useApi.js';
import { site } from '../site.config.js';
import NotFound from './NotFound.jsx';

function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 20, restDelta: 0.001 });
  return (
    <Portal>
      <motion.div className="fixed inset-x-0 top-0 z-[110] h-0.5 origin-left bg-ink" style={{ scaleX }} aria-hidden="true" />
    </Portal>
  );
}

function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href.split('#')[0]);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      {copied ? 'Link copied' : 'Copy link'}
    </button>
  );
}

export default function Post() {
  const { slug } = useParams();
  const { data, loading, error } = useApi(`/posts/${encodeURIComponent(slug)}`);
  const { scrollToId } = useSmoothScroll();
  const post = data?.post;

  // Deep links to a heading (#section) land on it once the body has rendered.
  useEffect(() => {
    if (!post || !window.location.hash) return undefined;
    const id = decodeURIComponent(window.location.hash.slice(1));
    const timer = setTimeout(() => scrollToId(id), 120);
    return () => clearTimeout(timer);
  }, [post, scrollToId]);

  if (error?.status === 404) return <NotFound />;

  return (
    <div className="pb-[clamp(4rem,8vw,8rem)] pt-36 md:pt-44">
      <Seo
        title={post?.title ?? 'Research note'}
        description={post?.excerpt || site.description}
        path={`/blog/${slug}`}
        image={post?.coverImage?.url ? mediaUrl(post.coverImage.url) : undefined}
        type={post ? 'article' : 'website'}
        noIndex={!post}
        publishedTime={post?.publishedAt}
        modifiedTime={post?.updatedAt}
        author={post?.author || 'VoiceLK Research Team'}
        tags={post?.tags ?? []}
        jsonLd={
          post
            ? {
                '@context': 'https://schema.org',
                '@type': 'BlogPosting',
                headline: post.title,
                description: post.excerpt || site.description,
                url: `${site.url}/blog/${post.slug}`,
                mainEntityOfPage: `${site.url}/blog/${post.slug}`,
                datePublished: post.publishedAt,
                dateModified: post.updatedAt || post.publishedAt,
                author: { '@type': 'Person', name: post.author || 'VoiceLK Research Team' },
                publisher: { '@type': 'Organization', name: 'VoiceLK Research Team', url: site.url },
                keywords: post.tags?.join(', '),
                ...(post.coverImage?.url && { image: new URL(mediaUrl(post.coverImage.url), site.url).href }),
              }
            : undefined
        }
      />
      <ReadingProgress />
      {loading && (
        <div className="mx-auto max-w-3xl space-y-5 px-4">
          <div className="skeleton mx-auto h-3 w-32" />
          <div className="skeleton mx-auto h-14 w-4/5" />
          <div className="skeleton mx-auto h-5 w-2/3" />
          <div className="skeleton mt-12 aspect-[16/9] w-full rounded-2xl" />
        </div>
      )}
      {error && error.status !== 404 && <p className="text-center text-muted">This note could not be loaded: {error.message}</p>}

      {post && (
        <>
          <PostArticle post={post} onJump={scrollToId} />

          <div className="mx-auto mt-20 w-[min(44rem,calc(100%-2rem))]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
              <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-ink">
                <ArrowLeft className="size-4" /> All notes
              </Link>
              <CopyLink />
            </div>

            {(data.older || data.newer) && (
              <nav className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="More notes">
                {data.older ? (
                  <Link to={`/blog/${data.older.slug}`} className="card group p-5 transition-shadow hover:shadow-soft">
                    <span className="eyebrow flex items-center gap-1">
                      <ArrowLeft className="size-3.5" /> Previous
                    </span>
                    <span className="mt-2 block font-serif text-xl leading-snug">{data.older.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {data.newer && (
                  <Link to={`/blog/${data.newer.slug}`} className="card group p-5 text-right transition-shadow hover:shadow-soft">
                    <span className="eyebrow flex items-center justify-end gap-1">
                      Next <ArrowRight className="size-3.5" />
                    </span>
                    <span className="mt-2 block font-serif text-xl leading-snug">{data.newer.title}</span>
                  </Link>
                )}
              </nav>
            )}

            <Reveal className="mt-16 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
              <p className="font-serif text-3xl">
                Get the next note <em>by email</em>
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">One message per post. Unsubscribe any time.</p>
              <NewsletterForm className="mx-auto mt-6 max-w-md text-left" />
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
}
