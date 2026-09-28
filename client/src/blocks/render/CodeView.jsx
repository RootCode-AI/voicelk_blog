import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { highlight, languageLabel } from '../../lib/highlight.js';

export default function CodeView({ code, language, filename }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(code ?? '', language), [code, language]);
  const lines = (code ?? '').split('\n').length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard can be blocked; the code is still selectable */
    }
  }

  return (
    <figure className="code-surface overflow-hidden rounded-xl shadow-card">
      <figcaption className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2.5 font-mono text-xs text-[#a3a5ad]">
        <span className="truncate">{filename || languageLabel(language)}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <div className="flex overflow-x-auto py-4 font-mono text-[13px] leading-[1.7]">
        {lines > 1 && (
          <span className="select-none pl-4 pr-4 text-right text-[#5d5f68]" aria-hidden="true">
            {Array.from({ length: lines }, (_, i) => (
              <span key={i} className="block">
                {i + 1}
              </span>
            ))}
          </span>
        )}
        <pre className={`flex-1 pr-6 ${lines > 1 ? '' : 'pl-4'}`}>
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </div>
    </figure>
  );
}
