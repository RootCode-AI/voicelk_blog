import { parseCsv, toNumber } from '../../lib/csv.js';

export default function TableView({ csv, header = true, caption }) {
  const rows = parseCsv(csv);
  if (!rows.length) return null;
  const [head, ...body] = header ? rows : [null, ...rows];
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r) => [...r, ...Array(Math.max(0, width - r.length)).fill('')];
  const numericCols = new Set(
    pad(rows[0]).flatMap((_, c) => (body.length && body.every((r) => r[c] === '' || r[c] === undefined || toNumber(r[c]) !== null) ? [c] : [])),
  );

  return (
    <figure>
      <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
        <table className="w-full border-collapse text-[15px]">
          {head && (
            <thead>
              <tr className="border-b border-line-strong">
                {pad(head).map((cell, c) => (
                  <th
                    key={c}
                    scope="col"
                    className={`whitespace-nowrap px-4 py-3 font-semibold text-ink ${numericCols.has(c) ? 'text-right' : 'text-left'}`}
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="border-b border-line last:border-0">
                {pad(row).map((cell, c) => (
                  <td
                    key={c}
                    className={`px-4 py-2.5 text-slate ${numericCols.has(c) ? 'text-right tabular-nums' : ''}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className="mt-3 text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}
