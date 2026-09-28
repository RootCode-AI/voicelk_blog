import { Mail, MailOpen, Reply, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';

export default function Messages() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/contact');
  const messages = data?.messages ?? [];

  async function act(fn) {
    try {
      await fn();
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 md:py-10">
      <p className="eyebrow">Contact form</p>
      <h1 className="mt-1 font-serif text-5xl">Messages</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Every message is kept here, and also forwarded to CONTACT_TO by email when Resend is configured.
      </p>

      <div className="mt-8 space-y-3">
        {loading && <div className="skeleton h-28" />}
        {error && <p className="text-danger">{error.message}</p>}
        {!loading && !error && messages.length === 0 && (
          <div className="card p-10 text-center text-muted">No messages yet.</div>
        )}
        {messages.map((m) => (
          <article key={m._id} className={`card p-5 ${m.read ? 'opacity-75' : ''}`}>
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {!m.read && <span className="mr-2 inline-block size-2 rounded-full bg-[#2a78d6]" aria-label="Unread" />}
                  {m.name}
                </p>
                <p className="text-sm text-muted">
                  {m.email} · {timeAgo(m.createdAt)}
                </p>
              </div>
              <div className="flex gap-1">
                <a href={`mailto:${m.email}`} className="btn-icon" title="Reply" aria-label="Reply">
                  <Reply className="size-4" />
                </a>
                <button
                  className="btn-icon"
                  title={m.read ? 'Mark unread' : 'Mark read'}
                  aria-label={m.read ? 'Mark unread' : 'Mark read'}
                  onClick={() => act(() => api.patch(`/contact/${m._id}`, { read: !m.read }))}
                >
                  {m.read ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
                </button>
                <button
                  className="btn-icon"
                  title="Delete"
                  aria-label="Delete"
                  onClick={() => window.confirm('Delete this message?') && act(() => api.del(`/contact/${m._id}`))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </header>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate">{m.message}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
