// Parses the small data tables authors type or paste into chart and table
// blocks. Comma-separated text and tab-separated text (what a spreadsheet puts
// on the clipboard) both work; double quotes wrap values that contain commas.

export function parseCsv(text) {
  const source = String(text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!source) return [];

  const firstLine = source.split('\n', 1)[0];
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  rows.push(row);

  return rows.filter((r) => r.some((c) => c !== ''));
}

export function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(/[,%\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Chart data: the first column labels the x-axis, every other column is a series.
export function csvToSeries(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header || header.length < 2) return { xKey: null, series: [], data: [] };
  const [xKey, ...series] = header.map((h, i) => h || `Column ${i + 1}`);
  const data = rows.map((r) => {
    const point = { [xKey]: r[0] ?? '' };
    series.forEach((s, i) => {
      point[s] = toNumber(r[i + 1]);
    });
    return point;
  });
  return { xKey, series, data };
}
