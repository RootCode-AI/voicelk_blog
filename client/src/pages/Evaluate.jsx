import { useCallback, useState } from 'react';
import { CircleCheck, Headphones, Loader2, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import AudioPlayer from '../blocks/render/AudioPlayer.jsx';
import Seo from '../components/Seo.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { CRITERIA, SCALE } from '../evaluate/criteria.js';

function RatingScale({ criterion, value, onChange, name, error }) {
  return (
    <fieldset className="max-w-xl">
      <legend className="text-sm font-medium text-ink">{criterion.label}</legend>
      <p className="mt-0.5 text-sm text-muted">{criterion.question}</p>
      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {SCALE.map((option) => (
          <label
            key={option.value}
            className="relative flex cursor-pointer flex-col items-center rounded-lg border border-line-strong bg-white px-1 py-2 text-center transition-colors hover:bg-wash has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-label={`${option.value} ${option.label}`}
              className="sr-only"
            />
            <span className="text-lg font-semibold tabular-nums leading-none">{option.value}</span>
            <span className="mt-1 text-[11px] leading-tight opacity-75">{option.label}</span>
          </label>
        ))}
      </div>
      {criterion.low && (
        <div className="mt-1.5 flex justify-between text-xs text-muted" aria-hidden="true">
          <span>{criterion.low}</span>
          <span>{criterion.high}</span>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </fieldset>
  );
}

function VerdictChoice({ value, onChange, name, error }) {
  const options = [
    { value: 'pass', label: 'Pass', icon: ThumbsUp, active: 'has-checked:border-success has-checked:bg-success' },
    { value: 'fail', label: 'Fail', icon: ThumbsDown, active: 'has-checked:border-danger has-checked:bg-danger' },
  ];
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">Pass or fail</legend>
      <p className="mt-0.5 text-sm text-muted">Would this clip be acceptable in a real product?</p>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {options.map(({ value: option, label, icon: Icon, active }) => (
          <label
            key={option}
            className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line-strong bg-white py-2.5 text-sm font-medium transition-colors hover:bg-wash has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${active}`}
          >
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="sr-only" />
            <Icon className="size-4" />
            {label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </fieldset>
  );
}

const EMPTY = { overall: null, clarity: null, naturalness: null, verdict: null, comment: '', website: '' };

function ClipCard({ sample, index, onRated }) {
  const [form, setForm] = useState(EMPTY);
  const [listened, setListened] = useState(false);
  const [state, setState] = useState({ busy: false, error: '', details: {} });
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const markListened = useCallback(() => setListened(true), []);

  const complete = CRITERIA.every((c) => form[c.key]) && form.verdict;

  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, error: '', details: {} });
    try {
      await api.post(`/evaluate/samples/${sample.id}/feedback`, form);
      onRated(sample.id);
    } catch (err) {
      // Already answered from this network: show it as done rather than as a failure.
      if (err.status === 409) return onRated(sample.id);
      setState({ busy: false, error: err.message, details: err.details ?? {} });
    }
  }

  const heading = `Clip ${index + 1}${sample.title ? ` · ${sample.title}` : ''}`;

  return (
    <article className="card overflow-hidden" aria-labelledby={`clip-${sample.id}`}>
      <div className="border-b border-line p-4 sm:p-6">
        <h2 id={`clip-${sample.id}`} className="font-serif text-3xl">
          {heading}
        </h2>
        <div className="mt-4">
          <AudioPlayer url={sample.audioUrl} title="Listen" transcript={sample.transcript} onPlay={markListened} />
        </div>
      </div>

      {sample.rated ? (
        <div className="flex items-center gap-3 bg-wash/60 p-4 text-sm text-slate sm:px-6" role="status">
          <CircleCheck className="size-5 shrink-0 text-success" />
          Thank you — your rating for this clip has been recorded.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6 p-4 sm:p-6" noValidate>
          <div className="space-y-6">
            {CRITERIA.map((criterion) => (
              <RatingScale
                key={criterion.key}
                criterion={criterion}
                name={`${criterion.key}-${sample.id}`}
                value={form[criterion.key]}
                onChange={set(criterion.key)}
                error={state.details[criterion.key]}
              />
            ))}
          </div>
          <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <VerdictChoice value={form.verdict} onChange={set('verdict')} name={`verdict-${sample.id}`} error={state.details.verdict} />
            <div>
              <label className="field-label" htmlFor={`comment-${sample.id}`}>
                Feedback <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id={`comment-${sample.id}`}
                className="field"
                rows={3}
                maxLength={2000}
                placeholder="Mispronounced words, odd pauses, anything that stood out…"
                value={form.comment}
                onChange={(e) => set('comment')(e.target.value)}
              />
              {state.details.comment && <p className="mt-1 text-sm text-danger">{state.details.comment}</p>}
            </div>
          </div>
          {/* Hidden from people; bots fill it in. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            value={form.website}
            onChange={(e) => set('website')(e.target.value)}
            aria-hidden="true"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {!listened ? 'Play the clip before you rate it.' : complete ? 'Ready to send.' : 'Answer all four questions to send.'}
            </p>
            <button type="submit" className="btn-dark" disabled={!listened || !complete || state.busy}>
              {state.busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send rating
            </button>
          </div>
          {state.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}
        </form>
      )}
    </article>
  );
}

export default function Evaluate() {
  const { data, loading, error, setData } = useApi('/evaluate/samples');
  const samples = data?.samples ?? [];
  const rated = samples.filter((s) => s.rated).length;

  const markRated = (id) => setData({ samples: samples.map((s) => (s.id === id ? { ...s, rated: true } : s)) });

  return (
    <>
      <Seo
        title="Rate VoiceLK speech"
        description="Listen to VoiceLK Sinhala-English speech samples and rate their quality, clarity and naturalness."
        path="/evaluate"
        noIndex
      />
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-6 md:pt-36">
        <Reveal>
          <p className="eyebrow">Listening test</p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.05] sm:text-6xl">How does VoiceLK sound to you?</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate">
            Each clip below was generated by VoiceLK from the text shown with it. Listen to a clip, ideally with headphones,
            then rate it. Your answers tell us where the voice still needs work.
          </p>
          <ul className="mt-6 grid gap-2 text-sm text-muted sm:grid-cols-2">
            <li className="flex gap-2">
              <Headphones className="mt-0.5 size-4 shrink-0" /> Rate each clip once; one response per clip is accepted from
              each network.
            </li>
            <li className="flex gap-2">
              <CircleCheck className="mt-0.5 size-4 shrink-0" /> No account needed. We keep your ratings, not your IP
              address.
            </li>
          </ul>
        </Reveal>

        {samples.length > 0 && (
          <div className="mt-10">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">
                {rated} of {samples.length} clips rated
              </span>
              {rated === samples.length && <span className="text-success">All done — thank you!</span>}
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-wash"
              role="progressbar"
              aria-label="Clips rated"
              aria-valuemin={0}
              aria-valuemax={samples.length}
              aria-valuenow={rated}
            >
              <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${(rated / samples.length) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="mt-8 space-y-8">
          {loading && <div className="skeleton h-72" />}
          {error && (
            <p className="card p-6 text-danger" role="alert">
              {error.status === 503 ? 'The listening test is not open yet. Please check back soon.' : error.message}
            </p>
          )}
          {!loading && !error && samples.length === 0 && (
            <p className="card p-10 text-center text-muted">There are no clips to rate right now. Please check back soon.</p>
          )}
          {samples.map((sample, index) => (
            <ClipCard key={sample.id} sample={sample} index={index} onRated={markRated} />
          ))}
        </div>
      </div>
    </>
  );
}
