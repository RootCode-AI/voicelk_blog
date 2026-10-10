import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { Loader2, Search, X } from 'lucide-react';
import PostRow, { PostRowSkeleton } from '../components/PostRow.jsx';
import Seo from '../components/Seo.jsx';
import { fadeUp, stagger } from '../components/motion/Reveal.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';

const PAGE_SIZE = 8;

export default function Blog() {
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') ?? '';
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const [pages, setPages] = useState({ key: '', posts: [], page: 0, total: 0, pagesTotal: 1 });
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: tagData } = useApi('/posts/tags');
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), ...(tag && { tag }), ...(q && { q }) }).toString();
  const { data, loading, error } = useApi(`/posts?${query}`);

  // Search as the reader types, a moment after they stop.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft.trim() === q) return;
      const next = new URLSearchParams(params);
      if (draft.trim()) next.set('q', draft.trim());
      else next.delete('q');
      setParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(timer);
  }, [draft, q, params, setParams]);

  const firstPage = data && pages.key !== query ? { posts: data.posts, total: data.total, pagesTotal: data.pages, page: 1 } : pages;
  const posts = firstPage.posts;

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await api.get(`/posts?${query}&page=${firstPage.page + 1}`);
      setPages({ key: query, posts: [...posts, ...next.posts], page: next.page, total: next.total, pagesTotal: next.pages });
    } finally {
      setLoadingMore(false);
    }
  }

  function selectTag(value) {
    const next = new URLSearchParams(params);
    if (value && value !== tag) next.set('tag', value);
    else next.delete('tag');
    setParams(next);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-[clamp(4rem,8vw,8rem)] pt-36 sm:px-6 md:pt-44">
      <Seo
        title="Research Journal"
        description="Experiments, design decisions and results from building a Sinhala-English code-switched text-to-speech system."
        path="/blog"
        noIndex={Boolean(tag || q)}
      />      <motion.header initial="hidden" animate="show" variants={stagger()} className="max-w-3xl">
        <motion.p variants={fadeUp} className="eyebrow mb-4">
          The journal
        </motion.p>
        <motion.h1 variants={fadeUp} className="font-serif text-[clamp(3rem,8vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
          Every note, <em className="text-slate">in order.</em>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
          Design decisions, experiments and results from building a code-switched Sinhala–English voice.
        </motion.p>
      </motion.header>

      <div className="mt-12 flex flex-col gap-5 border-b border-line pb-8 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className="w-full rounded-[40px] border border-line bg-white py-3 pl-11 pr-4 text-[15px] shadow-soft outline-none focus-visible:outline-2 focus-visible:outline-ink"
          />
        </div>
        {tagData?.tags?.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Filter by tag">
            {tagData.tags.slice(0, 12).map(({ tag: t, count }) => (
              <li key={t}>
                <button
                  onClick={() => selectTag(t)}
                  aria-pressed={tag === t}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    tag === t ? 'border-ink bg-ink text-paper' : 'border-line-strong text-slate hover:bg-wash'
                  }`}
                >
                  {t} <span className="opacity-60">{count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(tag || q) && (
        <div className="mt-6 flex items-center gap-3 text-sm text-muted">
          <span>
            {firstPage.total} {firstPage.total === 1 ? 'result' : 'results'}
            {tag && <> tagged “{tag}”</>}
            {q && <> for “{q}”</>}
          </span>
          <button
            onClick={() => {
              setDraft('');
              setParams({});
            }}
            className="inline-flex items-center gap-1 text-ink underline-offset-2 hover:underline"
          >
            <X className="size-3.5" /> Clear
          </button>
        </div>
      )}

      <div className="mt-14 space-y-20 md:space-y-28">
        {loading && !posts.length && [0, 1, 2].map((i) => <PostRowSkeleton key={i} />)}
        {error && <p className="text-muted">Posts could not be loaded: {error.message}</p>}
        {!loading && !error && posts.length === 0 && (
          <p className="py-16 text-center font-serif text-2xl italic text-muted">Nothing matches that yet.</p>
        )}
        {posts.map((post, i) => (
          <PostRow key={post._id} post={post} index={i} />
        ))}
      </div>

      {firstPage.page < firstPage.pagesTotal && (
        <div className="mt-20 flex justify-center">
          <button onClick={loadMore} className="btn-ghost" disabled={loadingMore}>
            {loadingMore && <Loader2 className="size-4 animate-spin" />}
            Load more notes
          </button>
        </div>
      )}
    </div>
  );
}
