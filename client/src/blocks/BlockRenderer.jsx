import { Suspense, lazy } from 'react';
import { CircleAlert, Info, Lightbulb, TriangleAlert } from 'lucide-react';
import { Reveal } from '../components/motion/Reveal.jsx';
import { headingId } from './registry.js';
import AudioPlayer from './render/AudioPlayer.jsx';
import CodeView from './render/CodeView.jsx';
import Markdown from './render/Markdown.jsx';
import MathView from './render/MathView.jsx';
import { ImageView, VideoView } from './render/MediaViews.jsx';
import TableView from './render/TableView.jsx';

// The charting library is the heaviest dependency, so it loads only for posts with a graph.
const ChartView = lazy(() => import('./render/ChartView.jsx'));

const CALLOUT = {
  note: { icon: Info, label: 'Note', className: 'border-[#2a78d6]/25 bg-[#2a78d6]/[0.05]', iconClass: 'text-[#2a78d6]' },
  tip: { icon: Lightbulb, label: 'Tip', className: 'border-[#0f7b3f]/25 bg-[#0f7b3f]/[0.05]', iconClass: 'text-[#0f7b3f]' },
  warning: { icon: TriangleAlert, label: 'Warning', className: 'border-[#b76e00]/30 bg-[#eda100]/[0.07]', iconClass: 'text-[#b76e00]' },
  important: { icon: CircleAlert, label: 'Important', className: 'border-[#b42318]/25 bg-[#b42318]/[0.04]', iconClass: 'text-[#b42318]' },
};

// Heading ids must be unique on the page, so repeats get a counter.
export function withHeadingIds(blocks) {
  const used = new Map();
  return blocks.map((block) => {
    if (block.type !== 'heading' || !block.data.text) return block;
    const base = headingId(block.data.text);
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return { ...block, anchor: n ? `${base}-${n + 1}` : base };
  });
}

function Block({ block }) {
  const { type, data } = block;
  switch (type) {
    case 'text':
      return data.markdown ? <Markdown>{data.markdown}</Markdown> : null;
    case 'heading': {
      if (!data.text) return null;
      const Tag = `h${data.level ?? 2}`;
      const size = { 2: 'text-[2.25rem] mt-8', 3: 'text-[1.6rem] mt-4', 4: 'text-xl mt-2' }[data.level ?? 2];
      return (
        <Tag id={block.anchor} className={`scroll-mt-28 font-serif leading-[1.15] tracking-[-0.01em] text-ink ${size}`}>
          {data.text}
        </Tag>
      );
    }
    case 'image':
      return <ImageView {...data} />;
    case 'code':
      return data.code ? <CodeView {...data} /> : null;
    case 'chart':
      return (
        <Suspense fallback={<div className="skeleton h-[420px] rounded-xl" />}>
          <ChartView {...data} />
        </Suspense>
      );
    case 'table':
      return <TableView {...data} />;
    case 'math':
      return data.latex ? <MathView {...data} /> : null;
    case 'audio':
      return <AudioPlayer {...data} />;
    case 'video':
      return <VideoView {...data} />;
    case 'quote':
      return data.text ? (
        <figure className="my-4 border-l-2 border-ink py-1 pl-6">
          <blockquote className="font-serif text-[1.9rem] italic leading-[1.25] text-ink">“{data.text}”</blockquote>
          {data.cite && <figcaption className="mt-3 text-sm text-muted">— {data.cite}</figcaption>}
        </figure>
      ) : null;
    case 'callout': {
      const tone = CALLOUT[data.tone] ?? CALLOUT.note;
      const Icon = tone.icon;
      return (
        <aside className={`flex gap-3 rounded-xl border p-4 sm:p-5 ${tone.className}`}>
          <Icon className={`mt-1 size-5 shrink-0 ${tone.iconClass}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{data.title || tone.label}</p>
            {data.markdown && <Markdown className="mt-1 text-[15px]">{data.markdown}</Markdown>}
          </div>
        </aside>
      );
    }
    case 'divider':
      return (
        <div className="flex justify-center gap-3 py-4 text-muted" aria-hidden="true">
          <span>·</span>
          <span>·</span>
          <span>·</span>
        </div>
      );
    default:
      return null;
  }
}

const ANIMATED = new Set(['image', 'code', 'chart', 'table', 'audio', 'video', 'quote', 'callout', 'math']);

// Renders a post body. Blocks keep exactly the order the author gave them;
// wide and full-width images break out of the reading column.
export default function BlockRenderer({ blocks, animate = true }) {
  return (
    <div className="article-grid">
      {withHeadingIds(blocks).map((block) => {
        const bleed = block.type === 'image' && block.data.width !== 'normal' ? `bleed-${block.data.width}` : '';
        const content = <Block block={block} />;
        return animate && ANIMATED.has(block.type) ? (
          <Reveal key={block.id} className={bleed}>
            {content}
          </Reveal>
        ) : (
          <div key={block.id} className={bleed}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
