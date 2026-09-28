import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function MathView({ latex, caption }) {
  const html = useMemo(
    () => katex.renderToString(latex ?? '', { displayMode: true, throwOnError: false, strict: 'ignore' }),
    [latex],
  );
  return (
    <figure className="text-ink">
      <div className="overflow-x-auto py-2 text-[1.1rem]" dangerouslySetInnerHTML={{ __html: html }} />
      {caption && <figcaption className="mt-2 text-center text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}
