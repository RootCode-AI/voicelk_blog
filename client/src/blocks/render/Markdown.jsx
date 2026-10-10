import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import CodeView from './CodeView.jsx';
import { imageAlt } from '../../../../shared/images.js';

// Markdown in text and callout blocks: GFM (tables, task lists, strikethrough),
// $inline$ and $$display$$ maths, and fenced code rendered like a code block.
// Raw HTML is not rendered, and react-markdown drops javascript: links.

const components = {
  a: ({ href, children }) => {
    const external = /^https?:\/\//.test(href ?? '');
    return (
      <a href={href} {...(external && { target: '_blank', rel: 'noreferrer' })}>
        {children}
      </a>
    );
  },
  pre: ({ children }) => {
    const code = children?.props;
    const language = /language-([\w+-]+)/.exec(code?.className ?? '')?.[1];
    const text = String(code?.children ?? '').replace(/\n$/, '');
    return (
      <div className="not-prose my-6">
        <CodeView code={text} language={language} />
      </div>
    );
  },
  img: ({ src, alt }) => <img src={src} alt={imageAlt(alt)} loading="lazy" />,
};

export default function Markdown({ children, className = '' }) {
  return (
    <div className={`prose-voice ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {children ?? ''}
      </ReactMarkdown>
    </div>
  );
}
