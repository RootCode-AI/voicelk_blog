import { useOpenCode } from '../context/OpenCodeContext.jsx';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, ArrowUpRight, FolderGit2 } from 'lucide-react';
import Hero from '../components/Hero.jsx';
import NewsletterForm from '../components/NewsletterForm.jsx';
import PostRow, { PostRowSkeleton } from '../components/PostRow.jsx';
import Seo from '../components/Seo.jsx';
import { Reveal, RevealGroup, fadeUp } from '../components/motion/Reveal.jsx';
import { useSmoothScroll } from '../components/motion/SmoothScroll.jsx';
import { useApi } from '../hooks/useApi.js';
import { site } from '../site.config.js';

function SectionHeading({ eyebrow, title, action }) {
  return (
    <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-4 md:mb-16">
      <div>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h2 className="max-w-2xl font-serif text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.02] tracking-[-0.01em]">{title}</h2>
      </div>
      {action}
    </Reveal>
  );
}

function LatestPosts({ section }) {
  const research = section === 'research';
  const { data, loading, error } = useApi(`/posts?limit=3&section=${section}`);
  const posts = data?.posts ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 py-[clamp(4rem,8vw,8rem)] sm:px-6">
      <SectionHeading
        eyebrow={research ? 'Research' : 'Journey'}
        title={
          <>
            {research ? <>Results &amp; <em>outcomes</em></> : <>Building the <em>product</em></>}
          </>
        }
        action={
          <Link to={`/${section}`} className="btn-ghost">
            {research ? 'All research' : 'Follow the journey'} <ArrowRight className="size-4" />
          </Link>
        }
      />
      <div className="space-y-20 md:space-y-28">
        {loading && [0, 1].map((i) => <PostRowSkeleton key={i} />)}
        {error && <p className="text-muted">Posts could not be loaded: {error.message}</p>}
        {!loading && !error && posts.length === 0 && (
          <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
            <p className="font-serif text-2xl italic">{research ? 'Research results are on their way.' : 'The first journey update is on its way.'}</p>
            <p className="mt-2 text-sm text-muted">Subscribe above and it will land in your inbox.</p>
          </div>
        )}
        {posts.map((post, i) => (
          <PostRow key={post._id} post={post} index={i} large={i === 0} />
        ))}
      </div>
    </section>
  );
}

function Pipeline() {
  return (
    <section id="project" className="scroll-mt-20 border-y border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-[clamp(4rem,8vw,8rem)] sm:px-6">
        <SectionHeading
          eyebrow="The product"
          title={
            <>
              From a line of text to a <em>voice</em>, in four steps
            </>
          }
        />
        <RevealGroup as="ol" className="grid gap-x-16 gap-y-12 md:grid-cols-2">
          {site.pipeline.map((p, i) => (
            <motion.li key={p.step} variants={fadeUp} className={i % 2 === 1 ? 'md:translate-y-16' : ''}>
              <span className="font-mono text-xs text-muted">{p.step}</span>
              <h3 className="mt-3 font-serif text-3xl leading-tight">{p.title}</h3>
              <p className="mt-3 max-w-md leading-relaxed text-slate">{p.body}</p>
            </motion.li>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function Repositories() {
  const { repos, loading } = useOpenCode();
  if (loading || !repos.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-[clamp(4rem,8vw,8rem)] sm:px-6">
      <SectionHeading
        eyebrow="Open code"
        title={
          <>
            Read the <em>source</em>
          </>
        }
      />
      <RevealGroup className="grid gap-4 sm:grid-cols-2">
        {repos.map((repo) => {
          const Wrapper = repo.url ? motion.a : motion.div;
          return (
            <Wrapper
              key={repo.id}
              variants={fadeUp}
              whileHover={repo.url ? { y: -3 } : undefined}
              {...(repo.url && { href: repo.url, target: '_blank', rel: 'noreferrer' })}
              className="card group flex flex-col p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-10 place-items-center rounded-lg bg-wash">
                  <FolderGit2 className="size-5 text-slate" />
                </span>
                {repo.url ? (
                  <ArrowUpRight className="size-5 text-muted transition-colors group-hover:text-ink" />
                ) : (
                  <span className="rounded-full bg-wash px-2.5 py-1 text-xs text-muted">Link coming soon</span>
                )}
              </div>
              <p className="mt-6 font-mono text-xs text-muted">{repo.name}</p>
              <h3 className="mt-1 font-serif text-2xl">{repo.label}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate">{repo.description}</p>
              <p className="mt-auto pt-6 text-xs text-muted">{repo.stack}</p>
            </Wrapper>
          );
        })}
      </RevealGroup>
    </section>
  );
}

function SubscribeBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-[clamp(4rem,8vw,8rem)] sm:px-6">
      <Reveal className="grid items-center gap-8 rounded-2xl bg-ink px-6 py-12 text-paper sm:px-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05]">
            Follow the <em>journey</em>.
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#b9bbc3]">
            Get VoiceLK updates, product progress, and the stories behind each improvement.
          </p>
        </div>
        <NewsletterForm onDark />
      </Reveal>
    </section>
  );
}

export default function Home() {
  const { hash } = useLocation();
  const { scrollToId } = useSmoothScroll();

  useEffect(() => {
    if (!hash) return undefined;
    // Wait a frame so the page has laid out before measuring the target.
    const frame = requestAnimationFrame(() => scrollToId(hash.slice(1)));
    return () => cancelAnimationFrame(frame);
  }, [hash, scrollToId]);

  return (
    <>
      <Seo
        description={site.description}
        path="/"
      />
      <Hero />
      <LatestPosts section="research" />
      <LatestPosts section="journey" />
      <Pipeline />
      <Repositories />
      <SubscribeBand />
    </>
  );
}
