import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleCheck, CircleX, Table2 } from 'lucide-react';
import { CRITERIA, SCALE, VERDICT, formatPercent, formatScore } from './criteria.js';

const GRID = '#e1e0d9';
const MUTED = '#6b6e7a';
const INK = '#1a1a1a';
const axis = { tick: { fill: MUTED, fontSize: 12 }, tickLine: false, axisLine: { stroke: '#c3c2b7' } };
const legendText = (value) => <span style={{ color: '#373a46', fontSize: 13 }}>{value}</span>;
// Recharts sorts legend entries alphabetically; keep the order the questions are asked.
const criterionOrder = (item) => CRITERIA.findIndex((c) => c.key === item.dataKey);

export function StatTile({ label, value, detail }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
    </div>
  );
}

function Swatch({ color }) {
  return <span className="size-2.5 shrink-0 rounded-sm" style={{ background: color }} aria-hidden="true" />;
}

function TooltipBox({ title, rows }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] shadow-card">
      {title && <p className="mb-1 font-medium text-ink">{title}</p>}
      <ul className="space-y-0.5">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2 text-slate">
            <Swatch color={row.color} />
            <span>{row.name}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// A chart with its title and a data-table view, so no reading depends on colour alone.
export function ChartCard({ title, description, table, children }) {
  const [showData, setShowData] = useState(false);
  return (
    <figure className="card p-4 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-ink">{title}</p>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowData((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-wash hover:text-ink"
          aria-pressed={showData}
        >
          <Table2 className="size-3.5" />
          {showData ? 'Show chart' : 'View data'}
        </button>
      </div>
      {showData ? <DataTable {...table} /> : children}
    </figure>
  );
}

function DataTable({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-left text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-medium ${i ? 'text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, i) => (
                <td key={i} className={`px-3 py-2 ${i ? 'text-right tabular-nums' : ''}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Mean opinion score per criterion with its 95% confidence interval.
export function MeanScoresChart({ summary }) {
  const data = CRITERIA.map((c) => ({
    name: c.label,
    color: c.color,
    mean: summary.criteria[c.key].mean,
    ci: summary.criteria[c.key].ci95 ?? 0,
    sd: summary.criteria[c.key].sd,
  }));
  const table = {
    head: ['Criterion', 'Mean', '95% CI ±', 'SD'],
    rows: data.map((d) => [d.name, formatScore(d.mean), d.ci ? formatScore(d.ci) : '–', formatScore(d.sd)]),
  };

  return (
    <ChartCard title="Mean opinion score" description="Average rating out of 5, with 95% confidence intervals." table={table}>
      <div style={{ height: 280 }} role="img" aria-label={`Mean scores: ${table.rows.map((r) => `${r[0]} ${r[1]}`).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 24, right: 12, bottom: 4, left: 0 }} barCategoryGap="32%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} axisLine={false} width={32} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} allowDataOverflow />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload;
                if (!d) return null;
                return (
                  <TooltipBox
                    title={d.name}
                    rows={[{ name: 'Mean', color: d.color, value: d.ci ? `${formatScore(d.mean)} ± ${formatScore(d.ci)}` : formatScore(d.mean) }]}
                  />
                );
              }}
            />
            {/* Not animated: the error bars would otherwise float above bars still growing. */}
            <Bar dataKey="mean" name="Mean" maxBarSize={56} radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
              <ErrorBar dataKey="ci" width={10} strokeWidth={1.5} stroke={INK} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// How many listeners chose each point of the scale, per criterion.
export function DistributionChart({ summary }) {
  const data = SCALE.map((s) => ({
    name: `${s.value} · ${s.label}`,
    ...Object.fromEntries(CRITERIA.map((c) => [c.key, summary.criteria[c.key].distribution[s.value - 1]])),
  }));
  const table = {
    head: ['Rating', ...CRITERIA.map((c) => c.label)],
    rows: data.map((d) => [d.name, ...CRITERIA.map((c) => d[c.key])]),
  };

  return (
    <ChartCard title="Rating distribution" description="Number of listeners who chose each rating." table={table}>
      <div style={{ height: 300 }} role="img" aria-label="Grouped bar chart of rating counts for each criterion">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }} barCategoryGap="22%" barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="name" {...axis} interval={0} tick={{ ...axis.tick, fontSize: 11 }} />
            <YAxis {...axis} axisLine={false} width={32} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              content={({ active, label }) => {
                const d = active && data.find((row) => row.name === label);
                if (!d) return null;
                return <TooltipBox title={label} rows={CRITERIA.map((c) => ({ name: c.label, color: c.color, value: d[c.key] }))} />;
              }}
            />
            <Legend iconType="circle" iconSize={9} formatter={legendText} itemSorter={criterionOrder} wrapperStyle={{ paddingTop: 12 }} />
            {CRITERIA.map((c) => (
              <Bar key={c.key} dataKey={c.key} name={c.label} fill={c.color} maxBarSize={22} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// Pass/fail as one proportional bar: two parts of a whole, labelled with counts.
export function VerdictBar({ summary }) {
  const { passed, failed, count } = summary;
  const parts = [
    { key: 'pass', value: passed, icon: CircleCheck, text: 'text-success', ...VERDICT.pass },
    { key: 'fail', value: failed, icon: CircleX, text: 'text-danger', ...VERDICT.fail },
  ];
  return (
    <figure className="card p-4 sm:p-6">
      <p className="font-medium text-ink">Pass / fail</p>
      <p className="mt-0.5 text-sm text-muted">Would listeners accept this clip in a real product?</p>
      {count ? (
        <>
          <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${passed} pass, ${failed} fail`}>
            {parts.map((p) =>
              p.value ? <div key={p.key} style={{ width: `${(p.value / count) * 100}%`, background: p.color }} /> : null,
            )}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
            {parts.map(({ key, label, value, icon: Icon, text }) => (
              <li key={key} className="flex items-center gap-2 text-sm">
                <Icon className={`size-4 ${text}`} />
                <span className="text-slate">{label}</span>
                <span className="font-medium tabular-nums">
                  {value} · {formatPercent(value / count)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-5 text-sm text-muted">No responses yet.</p>
      )}
    </figure>
  );
}

// Every rated clip side by side: one row per clip, one bar per criterion.
export function ComparisonChart({ samples }) {
  const rated = samples.filter((s) => s.summary.count > 0);
  if (!rated.length) return null;
  const short = (text) => (text.length > 22 ? `${text.slice(0, 21)}…` : text);
  const data = rated.map((s) => ({
    name: short(s.title),
    title: s.title,
    count: s.summary.count,
    ...Object.fromEntries(CRITERIA.map((c) => [c.key, s.summary.criteria[c.key].mean])),
  }));
  const table = {
    head: ['Clip', 'Responses', ...CRITERIA.map((c) => c.label), 'Pass rate'],
    rows: rated.map((s) => [
      s.title,
      s.summary.count,
      ...CRITERIA.map((c) => formatScore(s.summary.criteria[c.key].mean)),
      formatPercent(s.summary.passRate),
    ]),
  };

  return (
    <ChartCard title="Mean scores by clip" description="Average rating out of 5 for every clip that has responses." table={table}>
      <div style={{ height: 72 + rated.length * 64 }} role="img" aria-label="Horizontal bar chart comparing mean scores across clips">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }} barCategoryGap="22%" barGap={2}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" {...axis} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
            <YAxis type="category" dataKey="name" {...axis} axisLine={false} width={150} />
            <Tooltip
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              content={({ active, payload }) => {
                const d = active && payload?.[0]?.payload;
                if (!d) return null;
                return (
                  <TooltipBox
                    title={`${d.title} (${d.count} ${d.count === 1 ? 'response' : 'responses'})`}
                    rows={CRITERIA.map((c) => ({ name: c.label, color: c.color, value: formatScore(d[c.key]) }))}
                  />
                );
              }}
            />
            <Legend iconType="circle" iconSize={9} formatter={legendText} itemSorter={criterionOrder} wrapperStyle={{ paddingTop: 12 }} />
            {CRITERIA.map((c) => (
              <Bar key={c.key} dataKey={c.key} name={c.label} fill={c.color} maxBarSize={14} radius={[0, 4, 4, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
