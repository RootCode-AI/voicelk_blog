import { Download, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatShortDate } from '../lib/format.js';

const STATUS = {
  active: 'bg-[#0f7b3f]/10 text-success',
  pending: 'bg-[#eda100]/15 text-[#8a5a00]',
  unsubscribed: 'bg-wash text-muted',
};

export default function Subscribers() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/subscribers');
  const subscribers = data?.subscribers ?? [];

  async function remove(s) {
    if (!window.confirm(`Remove ${s.email}?`)) return;
    try {
      await api.del(`/subscribers/${s._id}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function exportCsv() {
    const rows = [['email', 'status', 'subscribed'], ...subscribers.map((s) => [s.email, s.status, s.createdAt])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'voicelk-subscribers.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Newsletter</p>
          <h1 className="mt-1 font-serif text-5xl">Subscribers</h1>
        </div>
        <button onClick={exportCsv} className="btn-ghost" disabled={!subscribers.length}>
          <Download className="size-4" /> Export CSV
        </button>
      </header>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Readers confirm their address by email before they receive posts. Only active subscribers are emailed.
      </p>

      <div className="card mt-8 overflow-hidden">
        {loading && <div className="skeleton m-5 h-24" />}
        {error && <p className="p-6 text-danger">{error.message}</p>}
        {!loading && !error && subscribers.length === 0 && <p className="p-10 text-center text-muted">No subscribers yet.</p>}
        {subscribers.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Since</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subscribers.map((s) => (
                <tr key={s._id}>
                  <td className="max-w-0 truncate px-5 py-3 sm:max-w-none">{s.email}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[s.status]}`}>{s.status}</span>
                  </td>
                  <td className="hidden px-5 py-3 text-muted sm:table-cell">{formatShortDate(s.createdAt)}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove(s)} className="btn-icon" aria-label={`Remove ${s.email}`}>
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
