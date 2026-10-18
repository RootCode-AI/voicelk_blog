import { useRef, useState } from 'react';
import { FileAudio, FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { api, uploadToSignedUrl } from '../lib/api.js';
import {
  ALLOWED_AUDIO_MIME_TYPES,
  AUDIO_EXTENSIONS,
  MAX_TRANSCRIPT_CHARS,
  audioSizeProblem,
  audioTypeOf,
  audioTypeProblem,
  textFileSizeProblem,
  transcriptProblem,
} from '../../../shared/evaluation.js';
import { formatBytes } from './criteria.js';

const count = new Intl.NumberFormat('en-GB');
const EMPTY = { title: '', system: '', transcript: '', transcriptFilename: '' };
// The picker offers the accepted types; the check below still catches "All files" picks.
const AUDIO_ACCEPT = [...ALLOWED_AUDIO_MIME_TYPES, ...AUDIO_EXTENSIONS.map((ext) => `.${ext}`)].join(',');

function FilePick({ id, accept, icon: Icon, label, hint, file, onPick, onClear }) {
  const input = useRef(null);
  return (
    <div className="relative">
      <span className="field-label">{label}</span>
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-line-strong bg-white px-3 py-2.5">
          <Icon className="size-5 shrink-0 text-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted">{formatBytes(file.size)}</p>
          </div>
          <button type="button" onClick={onClear} className="btn-icon" aria-label={`Remove ${file.name}`}>
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong bg-white px-3 py-4 text-sm text-muted transition-colors hover:bg-wash hover:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
        >
          <Icon className="size-5 shrink-0" />
          <span>{hint}</span>
        </label>
      )}
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          onPick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export default function UploadClip({ onUploaded, onCancel }) {
  const toast = useToast();
  const [audio, setAudio] = useState(null);
  const [textFile, setTextFile] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [progress, setProgress] = useState(null);
  const [errors, setErrors] = useState({});
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function pickAudio(file) {
    if (!file) return;
    const problem = audioTypeProblem(audioTypeOf(file)) ?? audioSizeProblem(file.size);
    if (problem) return setErrors({ audio: problem });
    setErrors((e) => ({ ...e, audio: undefined }));
    setAudio(file);
    setForm((f) => (f.title ? f : { ...f, title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') }));
  }

  async function pickText(file) {
    if (!file) return;
    const sizeProblem = textFileSizeProblem(file.size);
    if (sizeProblem) return setErrors({ transcript: sizeProblem });
    const text = (await file.text()).replace(/^\uFEFF/, '').trim();
    const problem = text ? transcriptProblem(text) : 'That text file is empty.';
    if (problem) return setErrors({ transcript: problem });
    setErrors((e) => ({ ...e, transcript: undefined }));
    setTextFile(file);
    setForm((f) => ({ ...f, transcript: text, transcriptFilename: file.name }));
  }

  async function submit(event) {
    event.preventDefault();
    // Check everything before any bytes leave the browser; the API checks it all again.
    const problems = {
      audio: audio ? audioTypeProblem(audioTypeOf(audio)) ?? audioSizeProblem(audio.size) : 'Choose the audio file.',
      transcript: transcriptProblem(form.transcript.trim()),
      title: form.title.trim() ? null : 'Give the clip a title.',
    };
    if (Object.values(problems).some(Boolean)) return setErrors(problems);
    setErrors({});
    setProgress(0);
    try {
      const contentType = audioTypeOf(audio);
      const upload = await api.post('/evaluate/console/uploads', { filename: audio.name, contentType, size: audio.size });
      await uploadToSignedUrl(upload.signedUrl, audio, { contentType, onProgress: setProgress });
      setProgress(1);
      const { sample } = await api.post('/evaluate/console/samples', {
        ...form,
        audioPath: upload.path,
        audioFilename: audio.name,
        audioType: contentType,
      });
      toast.success(`“${sample.title}” is live on the listening page.`);
      onUploaded(sample);
    } catch (err) {
      setProgress(null);
      setErrors({ ...(err.details ?? {}), form: err.message });
    }
  }

  const busy = progress !== null;

  return (
    <form onSubmit={submit} className="card space-y-5 p-5 sm:p-6" noValidate>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">Upload a clip</p>
          <p className="mt-0.5 text-sm text-muted">
            The audio file and the text it was generated from. Audio up to 10 MB; text up to {count.format(MAX_TRANSCRIPT_CHARS)} characters.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="btn-icon" aria-label="Close" disabled={busy}>
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FilePick
            id="clip-audio"
            accept={AUDIO_ACCEPT}
            icon={FileAudio}
            label="Audio file"
            hint="Choose an MP3, WAV, OGG, FLAC or M4A file"
            file={audio}
            onPick={pickAudio}
            onClear={() => setAudio(null)}
          />
          {errors.audio && <p className="mt-1 text-sm text-danger">{errors.audio}</p>}
        </div>
        <div>
          <FilePick
            id="clip-text"
            accept=".txt,text/plain"
            icon={FileText}
            label="Text file"
            hint="Choose the .txt file with the input text"
            file={textFile}
            onPick={pickText}
            onClear={() => {
              setTextFile(null);
              setForm((f) => ({ ...f, transcriptFilename: '' }));
            }}
          />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="clip-transcript">
          Text <span className="font-normal text-muted">(filled from the text file; you can edit it)</span>
        </label>
        <textarea
          id="clip-transcript"
          className="field"
          rows={4}
          value={form.transcript}
          onChange={set('transcript')}
          placeholder="මම office එකට යනවා…"
          aria-describedby="clip-transcript-count"
        />
        <div className="mt-1 flex justify-between gap-3 text-sm">
          <p className="text-danger">{errors.transcript}</p>
          <p
            id="clip-transcript-count"
            className={`shrink-0 text-xs tabular-nums ${form.transcript.trim().length > MAX_TRANSCRIPT_CHARS ? 'text-danger' : 'text-muted'}`}
          >
            {count.format(form.transcript.trim().length)} / {count.format(MAX_TRANSCRIPT_CHARS)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="clip-title">Title</label>
          <input id="clip-title" className="field" value={form.title} onChange={set('title')} maxLength={200} />
          <p className="mt-1 text-xs text-muted">Listeners see this title.</p>
          {errors.title && <p className="mt-1 text-sm text-danger">{errors.title}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="clip-system">
            Model or checkpoint <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="clip-system"
            className="field"
            value={form.system}
            onChange={set('system')}
            maxLength={120}
            placeholder="e.g. pathnirwana · step 120k"
          />
          <p className="mt-1 text-xs text-muted">Only the team sees this, so ratings stay blind.</p>
        </div>
      </div>

      {busy && (
        <div>
          <div className="flex justify-between text-xs text-muted">
            <span>{progress < 1 ? 'Uploading audio…' : 'Saving…'}</span>
            <span className="tabular-nums">{Math.round(progress * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-wash">
            <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
      {errors.form && (
        <p className="text-sm text-danger" role="alert">
          {errors.form}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost" disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn-dark" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          Upload clip
        </button>
      </div>
    </form>
  );
}
