import {
  AudioLines,
  ChartColumn,
  Code2,
  Heading,
  Image,
  Info,
  Minus,
  Pilcrow,
  Quote,
  Sigma,
  Table2,
  Video,
} from 'lucide-react';

// Every kind of content a post can hold. The editor offers these in its
// "add block" menu; the reader renders them in whatever order the author chose.
export const BLOCKS = [
  {
    type: 'text',
    label: 'Text',
    icon: Pilcrow,
    hint: 'Paragraphs, lists, links, inline maths',
    create: () => ({ markdown: '' }),
  },
  {
    type: 'heading',
    label: 'Heading',
    icon: Heading,
    hint: 'Section title, shown in the contents',
    create: () => ({ text: '', level: 2 }),
  },
  {
    type: 'image',
    label: 'Image',
    icon: Image,
    hint: 'Upload or link, with caption',
    create: () => ({ url: '', alt: '', caption: '', width: 'normal' }),
  },
  {
    type: 'code',
    label: 'Code',
    icon: Code2,
    hint: 'Highlighted snippet with copy button',
    create: () => ({ language: 'python', filename: '', code: '' }),
  },
  {
    type: 'chart',
    label: 'Graph',
    icon: ChartColumn,
    hint: 'Bar, line, area or donut from a table',
    create: () => ({
      chartType: 'bar',
      title: '',
      caption: '',
      yLabel: '',
      stacked: false,
      csv: 'Label,Series A,Series B\nFirst,4,6\nSecond,7,5\nThird,5,8',
    }),
  },
  {
    type: 'table',
    label: 'Table',
    icon: Table2,
    hint: 'Paste straight from a spreadsheet',
    create: () => ({ csv: 'Column,Value\nRow 1,\nRow 2,', caption: '', header: true }),
  },
  {
    type: 'math',
    label: 'Equation',
    icon: Sigma,
    hint: 'Display maths in LaTeX',
    create: () => ({ latex: '', caption: '' }),
  },
  {
    type: 'audio',
    label: 'Audio',
    icon: AudioLines,
    hint: 'Speech sample with transcript',
    create: () => ({ url: '', title: '', caption: '', transcript: '' }),
  },
  {
    type: 'video',
    label: 'Video',
    icon: Video,
    hint: 'YouTube, Vimeo or upload',
    create: () => ({ url: '', caption: '' }),
  },
  {
    type: 'quote',
    label: 'Quote',
    icon: Quote,
    hint: 'Pull quote with attribution',
    create: () => ({ text: '', cite: '' }),
  },
  {
    type: 'callout',
    label: 'Callout',
    icon: Info,
    hint: 'Note, tip or warning box',
    create: () => ({ tone: 'note', title: '', markdown: '' }),
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: Minus,
    hint: 'A quiet break between sections',
    create: () => ({}),
  },
];

export const blockMeta = (type) => BLOCKS.find((b) => b.type === type);

export function headingId(text) {
  return (
    String(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}
