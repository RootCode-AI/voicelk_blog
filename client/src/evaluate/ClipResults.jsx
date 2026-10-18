import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CircleCheck, CircleX, Download, Eye, EyeOff, Trash2 } from 'lucide-react';
import AudioPlayer from '../blocks/render/AudioPlayer.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { formatShortDate, timeAgo } from '../lib/format.js';
import { DistributionChart, MeanScoresChart, StatTile, VerdictBar } from './charts.jsx';
import { CRITERIA, formatBytes, formatPercent, formatScore } from './criteria.js';
import { FEEDBACK_COLUMNS, downloadCsv, feedbackRow } from './exportCsv.js';

function Response({ item }) {
  return (
    <li className="p-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {item.passed ? (
          <span className="flex items-center gap-1.5 font-medium text-success">
            <CircleCheck className="size-4" /> Pass
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-medium text-danger">
            <CircleX className="size-4" /> Fail
          </span>
        )}
        {CRITERIA.map((c) => (
          <span key={c.key} className="text-slate">
            {c.label} <span className="font-medium tabular-nums text-ink">{item[c.key]}</span>
          </span>
        ))}
        <span className="ml-auto text-xs text-muted">{timeAgo(item.createdAt)}</span>
      </div>
      {item.comment && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{item.comment}</p>}
    </li>
  );
}

export default function ClipResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(`/evaluate/console/samples/${id}`);
  const [commentsOnly, setCommentsOnly] = useState(true);

  if (loading) return <div className="skeleton m-8 h-64" />;
  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <Link to="/evaluate/console" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> All clips
        </Link>
        <p className="card mt-6 p-6 text-danger">{error.message}</p>
      </div>
    );
  }

  const { sample, feedback } = data;
  const { summary } = sample;
  const shown = commentsOnly ? feedback.filter((f) => f.comment) : feedback;

  async function toggle() {
    try {
      await api.patch(`/evaluate/console/samples/${sample.id}`, { active: !sample.active });
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${sample.title}” and its ${summary.count} responses? This cannot be undone.`)) return;
    try {
      await api.del(`/evaluate/console/samples/${sample.id}`);
      navigate('/evaluate/console', { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  }

  function exportClip() {
    const rows = feedback.map((f) =>
      feedbackRow({ ...f, sampleId: sample.id, title: sample.title, system: sample.system, rater: '', verdict: f.passed ? 'pass' : 'fail' }),
    );
    downloadCsv(`voicelk-clip-${sample.id.slice(0, 8)}.csv`, [FEEDBACK_COLUMNS, ...rows]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 md:py-10">
      <Link to="/evaluate/console" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All clips
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{sample.active ? 'On the listening page' : 'Hidden from listeners'}</p>
          <h1 className="mt-1 break-words font-serif text-5xl">{sample.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {[sample.system, `${sample.audioFilename} · ${formatBytes(sample.audioSize)}`, `${sample.uploadedBy} · ${formatShortDate(sample.createdAt)}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportClip} className="btn-ghost" disabled={!feedback.length}>
            <Download className="size-4" /> CSV
          </button>
          {sample.canManage && (
            <>
              <button onClick={toggle} className="btn-ghost">
                {sample.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {sample.active ? 'Hide' : 'Show'}
              </button>
              <button onClick={remove} className="btn-icon size-11!" aria-label="Delete clip">
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="mt-6">
        <AudioPlayer url={sample.audioUrl} title={sample.audioFilename} transcript={sample.transcript} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Responses" value={summary.count} />
        {CRITERIA.map((c) => {
          const { mean, ci95 } = summary.criteria[c.key];
          return <StatTile key={c.key} label={c.label} value={formatScore(mean)} detail={ci95 != null ? `± ${formatScore(ci95)} (95% CI)` : 'out of 5'} />;
        })}
        <StatTile label="Pass rate" value={formatPercent(summary.passRate)} detail={`${summary.passed} pass · ${summary.failed} fail`} />
      </div>

      {summary.count === 0 ? (
        <p className="card mt-6 p-10 text-center text-muted">
          No responses yet. Charts appear here once listeners rate this clip on the listening page.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <MeanScoresChart summary={summary} />
            <DistributionChart summary={summary} />
          </div>
          <div className="mt-6">
            <VerdictBar summary={summary} />
          </div>

          <section className="card mt-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:px-6">
              <h2 className="font-medium">Listener feedback</h2>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={commentsOnly} onChange={(e) => setCommentsOnly(e.target.checked)} />
                Only responses with written feedback
              </label>
            </div>
            {shown.length ? (
              <ul className="divide-y divide-line">
                {shown.map((item) => (
                  <Response key={item.id} item={item} />
                ))}
              </ul>
            ) : (
              <p className="p-8 text-center text-sm text-muted">No written feedback yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
