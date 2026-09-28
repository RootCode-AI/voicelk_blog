import { useRef } from 'react';
import {
  Bold,
  ChartArea,
  ChartColumn,
  ChartLine,
  ChartPie,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  Sigma,
} from 'lucide-react';
import ChartView from '../../blocks/render/ChartView.jsx';
import Markdown from '../../blocks/render/Markdown.jsx';
import MathView from '../../blocks/render/MathView.jsx';
import TableView from '../../blocks/render/TableView.jsx';
import { LANGUAGES } from '../../lib/highlight.js';
import { uploadFile } from '../../lib/api.js';
import { AutoTextarea, Field, MediaInput, Segmented } from './ui.jsx';

// ── Markdown with a small formatting toolbar ─────────────────────────────

function wrapSelection(el, before, after = before, placeholder = 'text') {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const selected = value.slice(start, end) || placeholder;
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  return { next, cursor: [start + before.length, start + before.length + selected.length] };
}

function prefixLines(el, prefix) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const block = value.slice(lineStart, end) || 'item';
  const lines = block.split('\n').map((l, i) => (typeof prefix === 'function' ? prefix(i) : prefix) + l);
  const next = value.slice(0, lineStart) + lines.join('\n') + value.slice(end);
  return { next, cursor: [lineStart, lineStart + lines.join('\n').length] };
}

const TOOLS = [
  { icon: Bold, label: 'Bold', key: 'b', run: (el) => wrapSelection(el, '**') },
  { icon: Italic, label: 'Italic', key: 'i', run: (el) => wrapSelection(el, '_') },
  { icon: Code, label: 'Inline code', run: (el) => wrapSelection(el, '`', '`', 'code') },
  { icon: Link2, label: 'Link', key: 'k', run: (el) => wrapSelection(el, '[', '](https://)', 'link text') },
  { icon: Sigma, label: 'Inline maths', run: (el) => wrapSelection(el, '$', '$', 'x^2') },
  { icon: List, label: 'Bulleted list', run: (el) => prefixLines(el, '- ') },
  { icon: ListOrdered, label: 'Numbered list', run: (el) => prefixLines(el, (i) => `${i + 1}. `) },
];

export function MarkdownField({ value, onChange, placeholder, minRows = 3, onPasteImage, large = false }) {
  const ref = useRef(null);

  function apply(tool) {
    const el = ref.current;
    const { next, cursor } = tool.run(el);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(...cursor);
    });
  }

  return (
    <div className="rounded-lg border border-line-strong bg-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(tool)}
            className="btn-icon size-7!"
            title={tool.key ? `${tool.label} (Ctrl+${tool.key.toUpperCase()})` : tool.label}
            aria-label={tool.label}
          >
            <tool.icon className="size-3.5" />
          </button>
        ))}
        <span className="ml-auto pr-2 text-[11px] text-muted">Markdown</span>
      </div>
      <AutoTextarea
        ref={ref}
        value={value}
        minRows={minRows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`block w-full bg-transparent px-3.5 py-3 leading-relaxed outline-none ${large ? 'text-[16px]' : 'text-[15px]'}`}
        onKeyDown={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return;
          const tool = TOOLS.find((t) => t.key === e.key.toLowerCase());
          if (tool) {
            e.preventDefault();
            apply(tool);
          }
        }}
        onPaste={(e) => {
          const file = e.clipboardData.files?.[0];
          if (file?.type.startsWith('image/') && onPasteImage) {
            e.preventDefault();
            onPasteImage(file);
          }
        }}
      />
    </div>
  );
}

// ── One editor per block type ─────────────────────────────────────────────

function Preview({ children }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-3">
      <p className="eyebrow mb-2 text-[10px]">Preview</p>
      {children}
    </div>
  );
}

const CHART_TYPES = [
  { value: 'bar', label: 'Bar', icon: ChartColumn },
  { value: 'line', label: 'Line', icon: ChartLine },
  { value: 'area', label: 'Area', icon: ChartArea },
  { value: 'pie', label: 'Donut', icon: ChartPie },
];

export default function BlockFields({ block, onChange, onInsertAfter, onError }) {
  const { type, data } = block;
  const set = (patch) => onChange({ ...data, ...patch });
  const text = (key) => ({ value: data[key] ?? '', onChange: (e) => set({ [key]: e.target.value }) });

  async function pasteImage(file) {
    try {
      const { url } = await uploadFile(file);
      onInsertAfter('image', { url, alt: '', caption: '', width: 'normal' });
    } catch (err) {
      onError(err.message);
    }
  }

  switch (type) {
    case 'text':
      return (
        <MarkdownField
          large
          value={data.markdown}
          onChange={(markdown) => set({ markdown })}
          onPasteImage={pasteImage}
          placeholder={'Write here. **bold**, _italic_, [links](https://…), lists, tables and $inline$ maths all work.\nPasting an image adds an image block right below.'}
        />
      );

    case 'heading':
      return (
        <div className="flex items-center gap-3">
          <input
            {...text('text')}
            placeholder="Section title"
            className={`min-w-0 flex-1 border-0 bg-transparent font-serif outline-none placeholder:text-[#b5b7bf] ${
              data.level === 2 ? 'text-3xl' : data.level === 3 ? 'text-2xl' : 'text-xl'
            }`}
          />
          <Segmented
            label="Heading level"
            value={data.level}
            onChange={(level) => set({ level })}
            options={[
              { value: 2, label: 'H2' },
              { value: 3, label: 'H3' },
              { value: 4, label: 'H4' },
            ]}
          />
        </div>
      );

    case 'image':
      return (
        <div className="space-y-4">
          <MediaInput kind="image" value={data.url} onChange={(url) => set({ url })} onError={onError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Alt text" hint="Describe the image for screen readers.">
              {(id) => <input id={id} className="field" {...text('alt')} />}
            </Field>
            <Field label="Caption">{(id) => <input id={id} className="field" {...text('caption')} />}</Field>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">Width</span>
            <Segmented
              label="Image width"
              value={data.width}
              onChange={(width) => set({ width })}
              options={[
                { value: 'normal', label: 'Column' },
                { value: 'wide', label: 'Wide' },
                { value: 'full', label: 'Full bleed' },
              ]}
            />
          </div>
        </div>
      );

    case 'code':
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <select className="field" value={data.language} onChange={(e) => set({ language: e.target.value })} aria-label="Language">
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <input className="field font-mono text-sm" placeholder="Filename (optional), e.g. train.py" {...text('filename')} />
          </div>
          <AutoTextarea
            {...text('code')}
            minRows={6}
            spellCheck={false}
            placeholder="Paste or write code…"
            className="field field-mono code-surface block border-transparent! text-[#e6e6e3]"
            onKeyDown={(e) => {
              if (e.key !== 'Tab' || e.shiftKey) return;
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: s, selectionEnd: end, value } = el;
              set({ code: `${value.slice(0, s)}  ${value.slice(end)}` });
              requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
            }}
          />
        </div>
      );

    case 'chart':
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented label="Chart type" value={data.chartType} onChange={(chartType) => set({ chartType })} options={CHART_TYPES} />
            {['bar', 'area'].includes(data.chartType) && (
              <label className="flex items-center gap-2 text-sm text-slate">
                <input type="checkbox" checked={data.stacked} onChange={(e) => set({ stacked: e.target.checked })} className="accent-ink" />
                Stacked
              </label>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">{(id) => <input id={id} className="field" placeholder="What the chart shows" {...text('title')} />}</Field>
            {data.chartType !== 'pie' && (
              <Field label="Y-axis label">{(id) => <input id={id} className="field" placeholder="e.g. MOS, loss, ms" {...text('yLabel')} />}</Field>
            )}
          </div>
          <Field
            label="Data"
            hint={
              data.chartType === 'pie'
                ? 'First column: slice names. Second column: values. Paste straight from Excel or Sheets.'
                : 'First row: headers. First column: x-axis labels. Every other column is a series. Paste straight from Excel or Sheets.'
            }
          >
            {(id) => <AutoTextarea id={id} {...text('csv')} minRows={4} spellCheck={false} className="field field-mono" />}
          </Field>
          <Field label="Caption">{(id) => <input id={id} className="field" placeholder="Source, method, or what to notice" {...text('caption')} />}</Field>
          <Preview>
            <ChartView {...data} height={260} />
          </Preview>
        </div>
      );

    case 'table':
      return (
        <div className="space-y-4">
          <Field label="Rows" hint="One row per line, commas or tabs between cells. Paste straight from a spreadsheet.">
            {(id) => <AutoTextarea id={id} {...text('csv')} minRows={4} spellCheck={false} className="field field-mono" />}
          </Field>
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Caption">{(id) => <input id={id} className="field" {...text('caption')} />}</Field>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-slate">
              <input type="checkbox" checked={data.header} onChange={(e) => set({ header: e.target.checked })} className="accent-ink" />
              First row is a header
            </label>
          </div>
          <Preview>
            <TableView csv={data.csv} header={data.header} />
          </Preview>
        </div>
      );

    case 'math':
      return (
        <div className="space-y-4">
          <Field label="LaTeX" hint="Display maths, e.g. \mathcal{L} = \mathcal{L}_{recon} + \mathcal{L}_{KL} + \mathcal{L}_{adv}">
            {(id) => <AutoTextarea id={id} {...text('latex')} minRows={2} spellCheck={false} className="field field-mono" />}
          </Field>
          <Field label="Caption">{(id) => <input id={id} className="field" {...text('caption')} />}</Field>
          {data.latex && (
            <Preview>
              <MathView latex={data.latex} />
            </Preview>
          )}
        </div>
      );

    case 'audio':
      return (
        <div className="space-y-4">
          <MediaInput kind="audio" value={data.url} onChange={(url) => set({ url })} onError={onError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">{(id) => <input id={id} className="field" placeholder="e.g. Checkpoint 120k, speaker 3" {...text('title')} />}</Field>
            <Field label="Caption">{(id) => <input id={id} className="field" {...text('caption')} />}</Field>
          </div>
          <Field label="Transcript" hint="The input text — Sinhala, English or both.">
            {(id) => <AutoTextarea id={id} {...text('transcript')} minRows={2} className="field" />}
          </Field>
        </div>
      );

    case 'video':
      return (
        <div className="space-y-4">
          <MediaInput
            kind="video"
            value={data.url}
            onChange={(url) => set({ url })}
            onError={onError}
            urlPlaceholder="https://www.youtube.com/watch?v=…"
          />
          <Field label="Caption">{(id) => <input id={id} className="field" {...text('caption')} />}</Field>
        </div>
      );

    case 'quote':
      return (
        <div className="space-y-3">
          <AutoTextarea
            {...text('text')}
            minRows={2}
            placeholder="The quote"
            className="w-full border-l-2 border-ink bg-transparent pl-4 font-serif text-2xl italic outline-none placeholder:text-[#b5b7bf]"
          />
          <input className="field" placeholder="Who said it (optional)" {...text('cite')} />
        </div>
      );

    case 'callout':
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Callout style"
              value={data.tone}
              onChange={(tone) => set({ tone })}
              options={[
                { value: 'note', label: 'Note' },
                { value: 'tip', label: 'Tip' },
                { value: 'warning', label: 'Warning' },
                { value: 'important', label: 'Important' },
              ]}
            />
            <input className="field min-w-0 flex-1" placeholder="Title (optional)" {...text('title')} />
          </div>
          <MarkdownField value={data.markdown} onChange={(markdown) => set({ markdown })} minRows={2} placeholder="What the reader should know" />
        </div>
      );

    case 'divider':
      return <p className="text-center text-sm text-muted">· · ·</p>;

    default:
      return <Markdown>{`Unknown block type \`${type}\``}</Markdown>;
  }
}
