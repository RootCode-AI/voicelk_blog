import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, FolderGit2, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

const FIELDS = [
  ['name', 'Repository name', 100, 'voicelk_ml'],
  ['label', 'Display title', 100, 'Speech engine'],
  ['description', 'Description', 600, 'What this repository contains'],
  ['stack', 'Tech stack', 180, 'Python, PyTorch'],
  ['url', 'Repository URL', 2048, 'https://github.com/organization/repository'],
];

export default function OpenCode() {
  const { data, loading, error, reload, setData } = useApi('/admin/open-code');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const toast = useToast();
  useEffect(() => { if (data) setDraft(structuredClone(data)); }, [data]);
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(data);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const edit = (id, patch) => {
    setFailure(null);
    setDraft(current => ({ ...current, repos: current.repos.map(repo => repo.id === id ? { ...repo, ...patch } : repo) }));
  };
  const move = (index, offset) => setDraft(current => {
    const repos = [...current.repos];
    [repos[index], repos[index + offset]] = [repos[index + offset], repos[index]];
    return { ...current, repos };
  });
  const add = () => setDraft(current => ({ ...current, repos: [...current.repos,
    { id: crypto.randomUUID(), name: '', label: '', description: '', stack: '', url: '', visible: true }] }));
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      const saved = await api.put('/admin/open-code', draft);
      setData(saved);
      setDraft(structuredClone(saved));
      toast.success('Open code updated on the website.');
    } catch (err) { setFailure(err); }
    finally { setBusy(false); }
  }

  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8 md:py-10">
    <p className="eyebrow">Admin</p>
    <h1 className="mt-1 font-serif text-5xl">Open code</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">Manage the repository cards under Read the source and the links in the footer. Save changes to publish your edits.</p>
    {loading && <div className="skeleton mt-6 h-40" />}
    {error && <div className="card mt-6 p-6" role="alert"><p className="text-danger">{error.message}</p><button className="btn-ghost mt-3" onClick={reload}>Try again</button></div>}
    {!loading && !error && draft && <form onSubmit={save} noValidate className="mt-6 space-y-5">
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <label className="card flex items-center gap-3 p-5 text-sm font-medium">
          <input type="checkbox" checked={draft.enabled} onChange={event => setDraft({ ...draft, enabled: event.target.checked })} />
          Show Open code on the website
        </label>
        {draft.repos.length === 0 && <p className="card p-8 text-center text-muted">No repositories. Add one to show a source card on the website.</p>}
        {draft.repos.map((repo, index) => <section key={repo.id} aria-label={`Repository ${index + 1}`} className="card min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex min-w-0 items-center gap-2 font-medium"><FolderGit2 className="size-4 shrink-0" /><span className="break-all">{repo.label || `Repository ${index + 1}`}</span></h2>
            <div className="flex items-center gap-1">
              <button type="button" className="btn-icon" aria-label={`Move repository ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-4" /></button>
              <button type="button" className="btn-icon" aria-label={`Move repository ${index + 1} down`} disabled={index === draft.repos.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-4" /></button>
              <button type="button" className="btn-icon text-danger" aria-label={`Remove repository ${index + 1}`} onClick={() => setDraft(current => ({ ...current, repos: current.repos.filter(item => item.id !== repo.id) }))}><Trash2 className="size-4" /></button>
            </div>
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {FIELDS.map(([field, label, max, placeholder]) => {
              const id = `${repo.id}-${field}`;
              const message = failure?.details?.[`repos.${index}.${field}`];
              return <div key={field} className={['description', 'url'].includes(field) ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
                <label className="field-label" htmlFor={id}>{label}</label>
                {field === 'description'
                  ? <textarea id={id} className="field min-h-24" value={repo[field]} maxLength={max} placeholder={placeholder} onChange={event => edit(repo.id, { [field]: event.target.value })} aria-invalid={!!message} aria-describedby={message ? `${id}-error` : undefined} />
                  : <input id={id} className="field" type={field === 'url' ? 'url' : 'text'} value={repo[field]} maxLength={max} placeholder={placeholder} onChange={event => edit(repo.id, { [field]: event.target.value })} aria-invalid={!!message} aria-describedby={message ? `${id}-error` : undefined} />}
                {message && <p id={`${id}-error`} className="mt-1 text-sm text-danger">{message}</p>}
              </div>;
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={repo.visible} onChange={event => edit(repo.id, { visible: event.target.checked })} />Show this repository</label>
            <p className="text-muted">Leave the URL blank to show Link coming soon.</p>
          </div>
        </section>)}
        <button type="button" className="btn-ghost" disabled={draft.repos.length >= 24} onClick={add}><Plus className="size-4" />Add repository</button>
      </fieldset>
      {failure && <p className="text-sm text-danger" role="alert">{failure.message}</p>}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper py-4">
        <p className="text-sm text-muted" role="status">{dirty ? 'Unsaved changes' : 'All changes saved'}</p>
        <button type="submit" className="btn-dark" disabled={!dirty || busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{busy ? 'Saving...' : 'Save changes'}</button>
      </div>
    </form>}
  </div>;
}
