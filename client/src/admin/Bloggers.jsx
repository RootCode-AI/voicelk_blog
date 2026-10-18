import { useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatShortDate } from '../lib/format.js';

const EMPTY = { email: '', name: '', password: '' };

export default function Bloggers() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/admin/bloggers');
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ busy: false, error: '', details: {} });
  const bloggers = data?.bloggers ?? [];
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function add(event) {
    event.preventDefault();
    setState({ busy: true, error: '', details: {} });
    try {
      await api.post('/admin/bloggers', form);
      toast.success(`${form.email} can now sign in at /write/login.`);
      setForm(EMPTY);
      setState({ busy: false, error: '', details: {} });
      reload();
    } catch (err) {
      setState({ busy: false, error: err.message, details: err.details ?? {} });
    }
  }

  async function remove(blogger) {
    const posts = blogger.published + blogger.drafts;
    const keep = posts ? ` Their ${posts} ${posts === 1 ? 'post stays' : 'posts stay'} on the site, and you can still edit ${posts === 1 ? 'it' : 'them'}.` : '';
    if (!window.confirm(`Remove ${blogger.email}? They are signed out at once.${keep}`)) return;
    try {
      await api.del(`/admin/bloggers/${blogger._id}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 md:py-10">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-1 font-serif text-5xl">Bloggers</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Bloggers write and publish their own posts at <span className="font-medium text-slate">/write</span>. They cannot see
        other people&rsquo;s posts, subscribers or messages, email subscribers, or open this admin panel. Share the password
        with them privately.
      </p>

      <form onSubmit={add} className="card mt-8 grid gap-4 p-5 sm:grid-cols-3 sm:p-6" noValidate>
        <div>
          <label className="field-label" htmlFor="blogger-email">Email</label>
          <input id="blogger-email" type="email" className="field" value={form.email} onChange={set('email')} autoComplete="off" />
          {state.details.email && <p className="mt-1 text-sm text-danger">{state.details.email}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="blogger-name">Name</label>
          <input id="blogger-name" className="field" value={form.name} onChange={set('name')} autoComplete="off" placeholder="Shown as the author" />
          {state.details.name && <p className="mt-1 text-sm text-danger">{state.details.name}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="blogger-password">Password</label>
          <input
            id="blogger-password"
            type="password"
            className="field"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
            minLength={10}
          />
          {state.details.password && <p className="mt-1 text-sm text-danger">{state.details.password}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-3">
          <p className="text-sm text-danger" role="alert">
            {state.error && !Object.keys(state.details).length ? state.error : ''}
          </p>
          <button type="submit" className="btn-dark" disabled={state.busy}>
            {state.busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            Add blogger
          </button>
        </div>
      </form>

      <div className="card mt-6 overflow-hidden">
        {loading && <div className="skeleton m-5 h-24" />}
        {error && <p className="p-6 text-danger">{error.message}</p>}
        {!loading && !error && bloggers.length === 0 && <p className="p-10 text-center text-muted">No bloggers yet.</p>}
        {bloggers.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Blogger</th>
                <th className="px-5 py-3 text-right font-medium">Posts</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bloggers.map((b) => (
                <tr key={b._id}>
                  <td className="max-w-0 px-5 py-3 sm:max-w-none">
                    <p className="truncate font-medium">{b.name || b.email}</p>
                    {b.name && <p className="truncate text-xs text-muted">{b.email}</p>}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums">
                    {b.published} published
                    <span className="block text-xs text-muted">{b.drafts} {b.drafts === 1 ? 'draft' : 'drafts'}</span>
                  </td>
                  <td className="hidden px-5 py-3 text-muted sm:table-cell">
                    {formatShortDate(b.createdAt)}
                    {b.createdBy && <span className="block text-xs">by {b.createdBy}</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove(b)} className="btn-icon" aria-label={`Remove ${b.email}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
