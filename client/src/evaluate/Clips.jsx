import { useState } from 'react';
import { Link } from 'react-router';
import { BarChart3, Download, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatShortDate } from '../lib/format.js';
import { ComparisonChart, StatTile } from './charts.jsx';
import { CRITERIA, formatPercent, formatScore } from './criteria.js';
import { FEEDBACK_COLUMNS, downloadCsv, feedbackRow } from './exportCsv.js';
import UploadClip from './UploadClip.jsx';

// Pools every response across clips, so each listener counts once rather than each clip.
function pooled(samples) {
  const count = samples.reduce((sum, s) => sum + s.summary.count, 0);
  const weighted = (pick) => (count ? samples.reduce((sum, s) => sum + (pick(s) ?? 0) * s.summary.count, 0) / count : null);
  return {
    count,
    overall: weighted((s) => s.summary.criteria.overall.mean),
    passRate: count ? samples.reduce((sum, s) => sum + s.summary.passed, 0) / count : null,
  };
}

export default function Clips() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/evaluate/console/samples');
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const samples = data?.samples ?? [];
  const totals = pooled(samples);

  async function toggle(sample) {
    try {
      await api.patch(`/evaluate/console/samples/${sample.id}`, { active: !sample.active });
      toast.success(sample.active ? `“${sample.title}” is hidden from listeners.` : `“${sample.title}” is back on the listening page.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(sample) {
    const responses = sample.summary.count;
    const warning = responses ? ` Its ${responses} ${responses === 1 ? 'response' : 'responses'} will be deleted too.` : '';
    if (!window.confirm(`Delete “${sample.title}”?${warning} This cannot be undone.`)) return;
    try {
      await api.del(`/evaluate/console/samples/${sample.id}`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function exportAll() {
    setExporting(true);
    try {
      const { rows } = await api.get('/evaluate/console/export');
      downloadCsv(`voicelk-evaluation-${new Date().toISOString().slice(0, 10)}.csv`, [FEEDBACK_COLUMNS, ...rows.map(feedbackRow)]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Listening evaluation</p>
          <h1 className="mt-1 font-serif text-5xl">Clips & results</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportAll} className="btn-ghost" disabled={!totals.count || exporting}>
            <Download className="size-4" /> Export responses
          </button>
          {!uploading && (
            <button onClick={() => setUploading(true)} className="btn-dark">
              <Plus className="size-4" /> Upload clip
            </button>
          )}
        </div>
      </header>

      {uploading && (
        <div className="mt-8">
          <UploadClip
            onCancel={() => setUploading(false)}
            onUploaded={() => {
              setUploading(false);
              reload();
            }}
          />
        </div>
      )}

      {error && (
        <p className="card mt-8 p-6 text-danger" role="alert">
          {error.message}
        </p>
      )}
      {loading && <div className="skeleton mt-8 h-40" />}

      {!loading && !error && (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Clips" value={samples.length} detail={`${samples.filter((s) => s.active).length} on the listening page`} />
            <StatTile label="Responses" value={totals.count} />
            <StatTile label="Overall MOS" value={formatScore(totals.overall)} detail="Across all responses, out of 5" />
            <StatTile label="Pass rate" value={formatPercent(totals.passRate)} />
          </div>

          <div className="mt-6">
            <ComparisonChart samples={samples} />
          </div>

          <div className="card mt-6 overflow-hidden">
            {samples.length === 0 ? (
              <p className="p-10 text-center text-muted">No clips yet. Upload an audio file and its text to start the listening test.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line text-left text-muted">
                    <tr>
                      <th className="px-5 py-3 font-medium">Clip</th>
                      <th className="px-3 py-3 text-right font-medium">Responses</th>
                      {CRITERIA.map((c) => (
                        <th key={c.key} className="hidden px-3 py-3 text-right font-medium md:table-cell">
                          {c.label}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-right font-medium">Pass</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {samples.map((s) => (
                      <tr key={s.id} className={s.active ? '' : 'text-muted'}>
                        <td className="max-w-72 px-5 py-3">
                          <Link to={`/evaluate/console/clips/${s.id}`} className="font-medium text-ink hover:underline">
                            {s.title}
                          </Link>
                          <p className="truncate text-xs text-muted">
                            {[s.system, s.active ? null : 'hidden', `${s.uploadedBy} · ${formatShortDate(s.createdAt)}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{s.summary.count}</td>
                        {CRITERIA.map((c) => (
                          <td key={c.key} className="hidden px-3 py-3 text-right tabular-nums md:table-cell">
                            {formatScore(s.summary.criteria[c.key].mean)}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-right tabular-nums">{formatPercent(s.summary.passRate)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right">
                          <Link to={`/evaluate/console/clips/${s.id}`} className="btn-icon" aria-label={`Results for ${s.title}`}>
                            <BarChart3 className="size-4" />
                          </Link>
                          {s.canManage && (
                            <>
                              <button
                                onClick={() => toggle(s)}
                                className="btn-icon"
                                aria-label={s.active ? `Hide ${s.title} from listeners` : `Show ${s.title} to listeners`}
                                title={s.active ? 'Hide from listeners' : 'Show to listeners'}
                              >
                                {s.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                              </button>
                              <button onClick={() => remove(s)} className="btn-icon" aria-label={`Delete ${s.title}`}>
                                <Trash2 className="size-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
