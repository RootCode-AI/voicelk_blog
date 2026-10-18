const cell = (value) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Downloads rows as a UTF-8 CSV. The byte-order mark lets Excel read Sinhala text.
export function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(cell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const FEEDBACK_COLUMNS = ['clip_id', 'clip_title', 'model', 'rater', 'overall', 'clarity', 'naturalness', 'verdict', 'comment', 'submitted_at'];

export const feedbackRow = (r) => [
  r.sampleId,
  r.title,
  r.system,
  r.rater,
  r.overall,
  r.clarity,
  r.naturalness,
  r.verdict,
  r.comment,
  r.createdAt,
];
