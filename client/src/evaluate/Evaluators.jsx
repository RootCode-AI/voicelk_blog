import { useState } from 'react';
import { Navigate } from 'react-router';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatShortDate } from '../lib/format.js';
import { useEvaluateAuth } from './EvaluateAuth.jsx';

const EMPTY = { email: '', name: '', password: '' };

export default function Evaluators() {
  const { user } = useEvaluateAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(user?.role === 'admin' ? '/evaluate/console/evaluators' : null);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ busy: false, error: '', details: {} });
  const evaluators = data?.evaluators ?? [];
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (user?.role !== 'admin') return <Navigate to="/evaluate/console" replace />;

  async function add(event) {
    event.preventDefault();
    setState({ busy: true, error: '', details: {} });
    try {
      await api.post('/evaluate/console/evaluators', form);
      toast.success(`${form.email} can now sign in at /evaluate/login.`);
      setForm(EMPTY);
      setState({ busy: false, error: '', details: {} });
      reload();
    } catch (err) {
      setState({ busy: false, error: err.message, details: err.details ?? {} });
    }
  }

  async function remove(evaluator) {
    if (!window.confirm(`Remove ${evaluator.email}? Their clips and the responses to them stay.`)) return;
    try {
      await api.del(`/evaluate/console/evaluators/${evaluator.id}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 md:py-10">
      <p className="eyebrow">Listening evaluation</p>
      <h1 className="mt-1 font-serif text-5xl">Evaluators</h1>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Evaluators can upload clips and read results in this console. They cannot open the blog admin. Share the password
        with them privately; they sign in at /evaluate/login.
      </p>

      <form onSubmit={add} className="card mt-8 grid gap-4 p-5 sm:grid-cols-3 sm:p-6" noValidate>
        <div>
          <label className="field-label" htmlFor="evaluator-new-email">Email</label>
          <input id="evaluator-new-email" type="email" className="field" value={form.email} onChange={set('email')} autoComplete="off" />
          {state.details.email && <p className="mt-1 text-sm text-danger">{state.details.email}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="evaluator-new-name">
            Name <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="evaluator-new-name" className="field" value={form.name} onChange={set('name')} autoComplete="off" />
          {state.details.name && <p className="mt-1 text-sm text-danger">{state.details.name}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="evaluator-new-password">Password</label>
          <input
            id="evaluator-new-password"
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
            Add evaluator
          </button>
        </div>
      </form>

      <div className="card mt-6 overflow-hidden">
        {loading && <div className="skeleton m-5 h-24" />}
        {error && <p className="p-6 text-danger">{error.message}</p>}
        {!loading && !error && evaluators.length === 0 && <p className="p-10 text-center text-muted">No evaluators yet.</p>}
        {evaluators.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Evaluator</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {evaluators.map((e) => (
                <tr key={e.id}>
                  <td className="max-w-0 px-5 py-3 sm:max-w-none">
                    <p className="truncate font-medium">{e.name || e.email}</p>
                    {e.name && <p className="truncate text-xs text-muted">{e.email}</p>}
                  </td>
                  <td className="hidden px-5 py-3 text-muted sm:table-cell">
                    {formatShortDate(e.createdAt)}
                    {e.createdBy && <span className="block text-xs">by {e.createdBy}</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => remove(e)} className="btn-icon" aria-label={`Remove ${e.email}`}>
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
