import { forwardRef, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { ImageUp, Link2, Loader2, UploadCloud, X } from 'lucide-react';
import { mediaUrl, uploadFile } from '../../lib/api.js';

// A textarea that grows with its content instead of scrolling inside itself.
export const AutoTextarea = forwardRef(function AutoTextarea({ value, className = '', minRows = 2, ...rest }, ref) {
  const inner = useRef(null);
  useImperativeHandle(ref, () => inner.current);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return <textarea ref={inner} rows={minRows} value={value} className={`resize-none overflow-hidden ${className}`} {...rest} />;
});

export function Segmented({ value, options, onChange, label }) {
  return (
    <div className="inline-flex rounded-lg border border-line-strong bg-white p-0.5" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
            }`}
            title={o.title}
          >
            {Icon && <Icon className="size-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({ label, children, hint }) {
  const id = useId();
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {typeof children === 'function' ? children(id) : children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const ACCEPT = {
  image: 'image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml',
  audio: 'audio/*',
  video: 'video/mp4,video/webm',
};

// Upload a file (click, drop or paste) or paste a link. Uploaded files are
// stored in MongoDB and referenced as /api/media/<id>.
export function MediaInput({ kind = 'image', value, onChange, onError, allowUrl = true, urlPlaceholder }) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const input = useRef(null);

  async function handle(file) {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadFile(file);
      onChange(url);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-line bg-wash">
        {kind === 'image' && <img src={mediaUrl(value)} alt="" className="max-h-72 w-full object-contain" />}
        {kind === 'audio' && <audio src={mediaUrl(value)} controls className="w-full p-2" />}
        {kind === 'video' && <p className="truncate p-3 pr-12 font-mono text-xs text-slate">{value}</p>}
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-slate shadow-card hover:text-ink"
          aria-label="Remove file"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        onPaste={(e) => handle(e.clipboardData.files?.[0])}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-7 text-center transition-colors ${
          dragging ? 'border-ink bg-wash' : 'border-line-strong hover:bg-paper'
        }`}
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-muted" />
        ) : kind === 'image' ? (
          <ImageUp className="size-5 text-muted" />
        ) : (
          <UploadCloud className="size-5 text-muted" />
        )}
        <p className="text-sm text-slate">{uploading ? 'Uploading…' : `Drop, paste or click to upload ${kind === 'image' ? 'an image' : `a${kind === 'audio' ? 'n audio' : ' video'} file`}`}</p>
        <input ref={input} type="file" accept={ACCEPT[kind]} className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
      </div>
      {allowUrl &&
        (showUrl ? (
          <input
            autoFocus
            className="field"
            placeholder={urlPlaceholder ?? 'https://…'}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onChange(e.currentTarget.value.trim());
              }
            }}
            onBlur={(e) => e.currentTarget.value.trim() && onChange(e.currentTarget.value.trim())}
          />
        ) : (
          <button type="button" onClick={() => setShowUrl(true)} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink">
            <Link2 className="size-3.5" /> {kind === 'video' ? 'Use a YouTube / Vimeo link instead' : 'Use a link instead'}
          </button>
        ))}
    </div>
  );
}
