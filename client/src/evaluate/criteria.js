// The listening-test criteria, in the order they are asked and charted. Each keeps
// its hue everywhere (slots 1–3 of the chart palette), so a criterion is the same
// colour on every chart in the console.
export const CRITERIA = [
  {
    key: 'overall',
    label: 'Overall quality',
    question: 'How good is this speech overall?',
    // The scale's own Bad…Excellent labels already say it.
    low: '',
    high: '',
    color: '#2a78d6',
  },
  {
    key: 'clarity',
    label: 'Clarity',
    question: 'Can you understand every word?',
    low: 'Hard to follow',
    high: 'Every word clear',
    color: '#eb6834',
  },
  {
    key: 'naturalness',
    label: 'Naturalness',
    question: 'Does it sound like a person or a machine?',
    low: 'Robotic',
    high: 'Human-like',
    color: '#1baf7a',
  },
];

// The standard absolute category rating scale used for mean opinion scores.
export const SCALE = [
  { value: 1, label: 'Bad' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'Fair' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Excellent' },
];

// Reserved status colours: never reused for a series, always shown with a label.
export const VERDICT = {
  pass: { label: 'Pass', color: '#0ca30c' },
  fail: { label: 'Fail', color: '#d03b3b' },
};

const score = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 0 });

export const formatScore = (value) => (value == null ? '–' : score.format(value));
export const formatPercent = (value) => (value == null ? '–' : percent.format(value));
export const formatBytes = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
