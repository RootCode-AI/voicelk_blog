import { useState } from 'react';
import { Link } from 'react-router';
import { ExternalLink, FilePlus2, Loader2, Mail, Pencil, Trash2 } from 'lucide-react';
import { AddBlogButton } from './AdminLayout.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatShortDate, timeAgo } from '../lib/format.js';
import { postSections, sectionForPost } from '../../../shared/postSections.js';
import { usePostScope } from './editor/scope.js';

function Stat({ label, value, hint }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value ?? '–'}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const MAIL_STATUS = {
  smtp: 'mail via Gmail',
  resend: 'mail via Resend',
  'resend-test-sender': 'Resend test sender: only your own address gets email. Verify your domain in Resend.',
  console: 'mail printed to the server console (no API key)',
};

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
];

export default function Dashboard() {
  const toast = useToast();
  const scope = usePostScope();
  const [filter, setFilter] = useState('');
  const [section, setSection] = useState('');
  // Site-wide numbers (subscribers included) are for administrators only.
  const { data: siteStats, reload: reloadSiteStats } = useApi(scope.canNotify ? '/admin/stats' : null);
  const { data, loading, error, reload } = useApi(`${scope.api}?${new URLSearchParams({ ...(filter && { status: filter }), ...(section && { section }) })}`);
  // A blogger's own counts come from their unfiltered list.
  const { data: own, reload: reloadOwn } = useApi(scope.canNotify ? null : scope.api);
  const stats = siteStats ?? (own && {
    published: own.posts.filter((p) => p.status === 'published').length,
    drafts: own.posts.filter((p) => p.status === 'draft').length,
  });
  const reloadStats = scope.canNotify ? reloadSiteStats : reloadOwn;
  const [busy, setBusy] = useState(null);

  async function remove(post) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setBusy(post._id);
    try {
      await api.del(`${scope.api}/${post._id}`);
      toast.success('Post deleted');
      reload();
      reloadStats();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function notify(post) {
    const again = post.notifiedAt ? ' Subscribers were already emailed about this post once.' : '';
    if (!window.confirm(`Email “${post.title}” to ${stats?.subscribers ?? 'all'} subscribers?${again}`)) return;
    setBusy(post._id);
    try {
      const { sent } = await api.post(`${scope.api}/${post._id}/notify`);
      toast.success(`Sent to ${sent} ${sent === 1 ? 'subscriber' : 'subscribers'}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const posts = data?.posts ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{scope.eyebrow}</p>
          <h1 className="mt-1 font-serif text-5xl">{scope.heading}</h1>
        </div>
        <AddBlogButton />
      </header>

      <div className={`mt-8 grid gap-4 ${scope.canNotify ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <Stat label="Published" value={stats?.published} />
        <Stat label="Drafts" value={stats?.drafts} />
        {scope.canNotify && (
          <Stat
            label="Subscribers"
            value={stats?.subscribers}
            hint={
              stats &&
              `${stats.pending} awaiting confirmation · ${MAIL_STATUS[stats.mail] ?? 'mail status unknown'}`
            }
          />
        )}
      </div>

      <div className="mt-8 max-w-sm">
        <label htmlFor="post-section-filter" className="field-label">Filter by section</label>
        <select id="post-section-filter" className="field" value={section} onChange={(event) => setSection(event.target.value)}>
          <option value="">All sections</option>
          {Object.entries(postSections).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
        </select>
      </div>
      <div className="mt-6 flex gap-1" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              filter === f.value ? 'bg-ink text-paper' : 'text-muted hover:bg-wash hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card mt-4 overflow-hidden">
        {loading && (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-12" />
            ))}
          </div>
        )}
        {error && <p className="p-6 text-danger">{error.message}</p>}
        {!loading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <FilePlus2 className="size-8 text-muted" />
            <p className="mt-4 font-serif text-2xl">No posts yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Write your first note — text, images, graphs, code, equations and audio samples, in any order.
            </p>
            <AddBlogButton className="mt-6" />
          </div>
        )}
        {posts.length > 0 && (
          <ul className="divide-y divide-line">
            {posts.map((post) => (
              <li key={post._id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-paper">
                <Link to={`${scope.base}/posts/${post._id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate">{sectionForPost(post).label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        post.status === 'published' ? 'bg-[#0f7b3f]/10 text-success' : 'bg-wash text-muted'
                      }`}
                    >
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    {post.notifiedAt && (
                      <span className="flex items-center gap-1 text-[11px] text-muted" title={`Emailed ${formatShortDate(post.notifiedAt)}`}>
                        <Mail className="size-3" /> emailed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-medium text-ink">{post.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {post.status === 'published' ? `Published ${formatShortDate(post.publishedAt)} · ` : ''}
                    Edited {timeAgo(post.updatedAt)}
                    {post.tags?.length ? ` · ${post.tags.join(', ')}` : ''}
                    {scope.showAuthors && post.blogger ? ` · by ${post.author || 'a blogger'} (blogger)` : ''}
                  </p>
                </Link>
                <div className="flex items-center gap-1">
                  {busy === post._id && <Loader2 className="mr-2 size-4 animate-spin text-muted" />}
                  <Link to={`${scope.base}/posts/${post._id}`} className="btn-icon" title="Edit" aria-label="Edit">
                    <Pencil className="size-4" />
                  </Link>
                  {post.status === 'published' && (
                    <>
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="btn-icon" title="View" aria-label="View">
                        <ExternalLink className="size-4" />
                      </a>
                      {scope.canNotify && (
                        <button onClick={() => notify(post)} className="btn-icon" title="Email subscribers" aria-label="Email subscribers" disabled={busy === post._id}>
                          <Mail className="size-4" />
                        </button>
                      )}
                    </>
                  )}
                  <button onClick={() => remove(post)} className="btn-icon hover:text-danger!" title="Delete" aria-label="Delete" disabled={busy === post._id}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
