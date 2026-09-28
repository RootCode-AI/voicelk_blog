import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Eye, EyeOff, Loader2, PenLine, Send } from 'lucide-react';
import PostArticle from '../../components/PostArticle.jsx';
import { blockMeta } from '../../blocks/registry.js';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { newId, slugify, timeAgo } from '../../lib/format.js';
import BlockList from './BlockList.jsx';
import { AutoTextarea, Field, MediaInput, Segmented } from './ui.jsx';

const emptyPost = () => ({
  title: '',
  slug: '',
  excerpt: '',
  tags: '',
  author: '',
  featured: false,
  coverImage: { url: '', alt: '' },
  status: 'draft',
  blocks: [{ id: newId(), type: 'text', data: { markdown: '' } }],
});

// The editable shape of a post (tags as a comma list for the input).
function toForm(post) {
  return {
    title: post.title ?? '',
    slug: post.slug ?? '',
    excerpt: post.excerpt ?? '',
    tags: (post.tags ?? []).join(', '),
    author: post.author ?? '',
    featured: Boolean(post.featured),
    coverImage: { url: post.coverImage?.url ?? '', alt: post.coverImage?.alt ?? '' },
    status: post.status ?? 'draft',
    blocks: post.blocks ?? [],
  };
}

export default function PostEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(isNew ? emptyPost : null);
  const [saved, setSaved] = useState(isNew ? null : undefined);
  const [meta, setMeta] = useState({ publishedAt: null, notifiedAt: null, updatedAt: null });
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('write');
  const [notify, setNotify] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const skipBlock = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    if (isNew) return;
    api
      .get(`/admin/posts/${id}`)
      .then(({ post }) => {
        const f = toForm(post);
        setForm(f);
        setSaved(JSON.stringify(f));
        setMeta({ publishedAt: post.publishedAt, notifiedAt: post.notifiedAt, updatedAt: post.updatedAt });
      })
      .catch((err) => setLoadError(err));
  }, [id, isNew]);

  const dirty = form !== null && JSON.stringify(form) !== saved;

  // Guard against losing work: closing the tab, and navigating inside the app.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (skipBlock.current) return false;
    return dirty && currentLocation.pathname !== nextLocation.pathname;
  });
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Leave without saving?')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const setTitle = (title) =>
    setForm((f) => ({ ...f, title, ...(!slugTouched && { slug: slugify(title) }) }));

  const actions = useMemo(
    () => ({
      update: (index, data) =>
        setForm((f) => ({ ...f, blocks: f.blocks.map((b, i) => (i === index ? { ...b, data } : b)) })),
      insert: (index, type, data) =>
        setForm((f) => {
          const block = { id: newId(), type, data: data ?? blockMeta(type).create() };
          const blocks = [...f.blocks];
          blocks.splice(index, 0, block);
          return { ...f, blocks };
        }),
      remove: (index) => {
        const block = formRef.current.blocks[index];
        const hasContent = Object.values(block.data).some((v) => typeof v === 'string' && v.trim());
        if (hasContent && !window.confirm(`Delete this ${blockMeta(block.type)?.label.toLowerCase()} block?`)) return;
        setForm((f) => ({ ...f, blocks: f.blocks.filter((b) => b.id !== block.id) }));
      },
      duplicate: (index) =>
        setForm((f) => {
          const copy = { ...structuredClone(f.blocks[index]), id: newId() };
          const blocks = [...f.blocks];
          blocks.splice(index + 1, 0, copy);
          return { ...f, blocks };
        }),
      move: (index, delta) =>
        setForm((f) => {
          const target = index + delta;
          if (target < 0 || target >= f.blocks.length) return f;
          const blocks = [...f.blocks];
          [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
          return { ...f, blocks };
        }),
      reorder: (ids) =>
        setForm((f) => {
          const byId = new Map(f.blocks.map((b) => [b.id, b]));
          return { ...f, blocks: ids.map((bid) => byId.get(bid)) };
        }),
    }),
    [],
  );

  const save = useCallback(
    async (status = form?.status) => {
      if (!form || saving) return;
      if (!form.title.trim()) {
        toast.error('Give the post a title before saving.');
        return;
      }
      setSaving(true);
      const wasPublished = saved ? JSON.parse(saved).status === 'published' : false;
      const payload = {
        ...form,
        status,
        slug: form.slug,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      try {
        const { post } = isNew ? await api.post('/admin/posts', payload) : await api.put(`/admin/posts/${id}`, payload);
        const f = toForm(post);
        setForm(f);
        setSaved(JSON.stringify(f));
        setSlugTouched(true);
        setMeta({ publishedAt: post.publishedAt, notifiedAt: post.notifiedAt, updatedAt: post.updatedAt });

        const justPublished = status === 'published' && !wasPublished;
        toast.success(justPublished ? 'Published — the post is live' : status === 'published' ? 'Changes are live' : 'Draft saved');

        if (justPublished && notify && !post.notifiedAt) {
          try {
            const res = await api.post(`/admin/posts/${post._id}/notify`);
            setMeta((m) => ({ ...m, notifiedAt: res.notifiedAt }));
            toast.success(`Emailed ${res.sent} ${res.sent === 1 ? 'subscriber' : 'subscribers'}`);
          } catch (err) {
            toast.error(`Published, but the email failed: ${err.message}`);
          }
        }
        if (isNew) {
          skipBlock.current = true;
          navigate(`/admin/posts/${post._id}`, { replace: true });
          skipBlock.current = false;
        }
      } catch (err) {
        const details = err.details ? ` ${Object.values(err.details).join(' ')}` : '';
        toast.error(`${err.message}${details}`);
      } finally {
        setSaving(false);
      }
    },
    [form, saving, saved, isNew, id, notify, toast, navigate],
  );

  // Ctrl/Cmd + S saves without changing the status.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  if (loadError) {
    return (
      <div className="p-10">
        <p className="text-danger">{loadError.message}</p>
        <Link to="/admin" className="btn-ghost mt-4">
          Back to posts
        </Link>
      </div>
    );
  }
  if (!form) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Loader2 className="size-6 animate-spin text-muted" />
      </div>
    );
  }

  const published = form.status === 'published' && saved && JSON.parse(saved).status === 'published';
  const previewPost = {
    ...form,
    tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    publishedAt: meta.publishedAt,
    readingMinutes: Math.max(1, Math.round(JSON.stringify(form.blocks).split(/\s+/).length / 240)),
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="sticky top-0 z-[100] border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
          <Link to="/admin" className="btn-icon" aria-label="Back to posts">
            <ArrowLeft className="size-4" />
          </Link>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              published ? 'bg-[#0f7b3f]/10 text-success' : 'bg-wash text-muted'
            }`}
          >
            {published ? 'Published' : 'Draft'}
          </span>
          <span className="hidden text-xs text-muted sm:inline" aria-live="polite">
            {saving ? 'Saving…' : dirty ? 'Unsaved changes' : meta.updatedAt ? `Saved ${timeAgo(meta.updatedAt)}` : 'Not saved yet'}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Segmented
              label="Editor mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'write', label: 'Write', icon: PenLine },
                { value: 'preview', label: 'Preview', icon: Eye },
              ]}
            />
            {published ? (
              <>
                <button className="btn-ghost px-4! py-2! text-sm" onClick={() => save('draft')} disabled={saving}>
                  <EyeOff className="size-4" /> Unpublish
                </button>
                <button className="btn-dark px-4! py-2! text-sm" onClick={() => save('published')} disabled={saving || !dirty}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Update
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost px-4! py-2! text-sm" onClick={() => save('draft')} disabled={saving}>
                  Save draft
                </button>
                <button className="btn-dark px-4! py-2! text-sm" onClick={() => save('published')} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Publish
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {mode === 'preview' ? (
        <div className="py-16">
          <PostArticle post={previewPost} animate={false} />
        </div>
      ) : (
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            <AutoTextarea
              value={form.title}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, ''))}
              minRows={1}
              placeholder="Title"
              aria-label="Title"
              className="block w-full bg-transparent font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] outline-none placeholder:text-[#c4c6cc]"
            />
            <AutoTextarea
              value={form.excerpt}
              onChange={(e) => update({ excerpt: e.target.value.replace(/\n/g, ' ') })}
              minRows={1}
              maxLength={400}
              placeholder="A one- or two-sentence summary, shown on cards and in emails"
              aria-label="Excerpt"
              className="mt-3 block w-full bg-transparent text-lg leading-relaxed text-slate outline-none placeholder:text-[#b5b7bf]"
            />
            <div className="mt-8">
              <BlockList blocks={form.blocks} actions={actions} onError={toast.error} />
            </div>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            <div className="card space-y-4 p-5">
              <p className="text-sm font-semibold">Post settings</p>
              <Field label="URL slug" hint={form.slug ? `/blog/${form.slug}` : 'Generated from the title'}>
                {(fid) => (
                  <input
                    id={fid}
                    className="field font-mono text-sm"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                    }}
                  />
                )}
              </Field>
              <Field label="Tags" hint="Comma separated, e.g. g2p, vits, evaluation">
                {(fid) => <input id={fid} className="field" value={form.tags} onChange={(e) => update({ tags: e.target.value })} />}
              </Field>
              <Field label="Author">
                {(fid) => <input id={fid} className="field" value={form.author} onChange={(e) => update({ author: e.target.value })} />}
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate">
                <input type="checkbox" className="accent-ink" checked={form.featured} onChange={(e) => update({ featured: e.target.checked })} />
                Featured post
              </label>
            </div>

            <div className="card space-y-3 p-5">
              <p className="text-sm font-semibold">Cover image</p>
              <MediaInput
                kind="image"
                value={form.coverImage.url}
                onChange={(url) => update({ coverImage: { ...form.coverImage, url } })}
                onError={toast.error}
              />
              {form.coverImage.url && (
                <input
                  className="field"
                  placeholder="Alt text"
                  value={form.coverImage.alt}
                  onChange={(e) => update({ coverImage: { ...form.coverImage, alt: e.target.value } })}
                />
              )}
            </div>

            {!published && (
              <div className="card p-5">
                <label className="flex items-start gap-2.5 text-sm text-slate">
                  <input type="checkbox" className="mt-0.5 accent-ink" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                  <span>
                    <span className="font-medium text-ink">Email subscribers when I publish</span>
                    <span className="mt-0.5 block text-xs text-muted">Sent through Resend to every confirmed subscriber.</span>
                  </span>
                </label>
              </div>
            )}

            <div className="rounded-xl border border-line p-5 text-xs leading-relaxed text-muted">
              <p className="mb-2 font-semibold text-slate">Tips</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Hover between two blocks and press + to insert exactly there.</li>
                <li>Drag the grip to reorder, or use the arrows.</li>
                <li>Paste an image into a text block to drop it in below.</li>
                <li>Charts and tables accept data pasted from Excel or Sheets.</li>
                <li>Ctrl + S saves at any time.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
