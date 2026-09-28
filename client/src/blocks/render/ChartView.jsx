import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Table2 } from 'lucide-react';
import { csvToSeries } from '../../lib/csv.js';
import TableView from './TableView.jsx';

// Categorical hues in a fixed, colour-blind-validated order. A series keeps its
// slot by column position, so colours never shuffle when data changes.
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const SURFACE = '#ffffff';
const GRID = '#e1e0d9';
const MUTED = '#6b6e7a';
const MAX_SERIES = SERIES.length;

const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] shadow-card">
      {label !== undefined && <p className="mb-1 font-medium text-ink">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={p.dataKey ?? p.name} className="flex items-center gap-2 text-slate">
            <span className="size-2.5 rounded-sm" style={{ background: p.payload?.fill ?? p.color }} aria-hidden="true" />
            <span>{p.name}</span>
            <span className="ml-auto pl-4 font-medium tabular-nums text-ink">
              {p.value == null ? '–' : numberFormat.format(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const axisProps = {
  tick: { fill: MUTED, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: '#c3c2b7' },
};

function legendFormatter(value) {
  return <span style={{ color: '#373a46', fontSize: 13 }}>{value}</span>;
}

export default function ChartView({ chartType = 'bar', title, caption, yLabel, stacked, csv, height = 340 }) {
  const [showData, setShowData] = useState(false);
  const { xKey, series: allSeries, data } = csvToSeries(csv);
  const series = allSeries.slice(0, MAX_SERIES);

  if (!xKey || !series.length || !data.length) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong p-6 text-center text-sm text-muted">
        Add a header row and at least one data row to draw this chart.
      </div>
    );
  }

  const showLegend = series.length > 1 || chartType === 'pie';
  const yAxis = (
    <YAxis
      {...axisProps}
      axisLine={false}
      width={52}
      tickFormatter={(v) => compact.format(v)}
      label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 12, dx: -2 } : undefined}
    />
  );
  const common = { data, margin: { top: 8, right: 12, bottom: 4, left: yLabel ? 8 : 0 } };
  const grid = <CartesianGrid vertical={false} stroke={GRID} />;
  // Recharts sorts legend and tooltip entries alphabetically; keep the author's column order.
  const columnOrder = (item) => series.indexOf(item.dataKey ?? item.value);
  const tooltip = (
    <Tooltip
      content={<ChartTooltip />}
      itemSorter={columnOrder}
      cursor={chartType === 'bar' ? { fill: 'rgba(0,0,0,0.04)' } : { stroke: '#c3c2b7' }}
    />
  );
  const legend = showLegend ? (
    <Legend
      iconType="circle"
      iconSize={9}
      formatter={legendFormatter}
      itemSorter={chartType === 'pie' ? null : columnOrder}
      wrapperStyle={{ paddingTop: 12 }}
    />
  ) : null;

  let chart;
  if (chartType === 'line') {
    chart = (
      <LineChart {...common}>
        {grid}
        <XAxis dataKey={xKey} {...axisProps} />
        {yAxis}
        {tooltip}
        {legend}
        {series.map((s, i) => (
          <Line
            key={s}
            dataKey={s}
            stroke={SERIES[i]}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={data.length <= 24 ? { r: 4, fill: SERIES[i], stroke: SURFACE, strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: SERIES[i], stroke: SURFACE, strokeWidth: 2 }}
            connectNulls
            isAnimationActive
          />
        ))}
      </LineChart>
    );
  } else if (chartType === 'area') {
    chart = (
      <AreaChart {...common}>
        {grid}
        <XAxis dataKey={xKey} {...axisProps} />
        {yAxis}
        {tooltip}
        {legend}
        {series.map((s, i) => (
          <Area
            key={s}
            dataKey={s}
            stackId={stacked ? 'stack' : undefined}
            stroke={SERIES[i]}
            strokeWidth={2}
            fill={SERIES[i]}
            fillOpacity={0.1}
            activeDot={{ r: 5, fill: SERIES[i], stroke: SURFACE, strokeWidth: 2 }}
            connectNulls
          />
        ))}
      </AreaChart>
    );
  } else if (chartType === 'pie') {
    const key = series[0];
    const slices = data
      .map((d) => ({ name: String(d[xKey]), value: d[key] ?? 0 }))
      .filter((d) => d.value > 0)
      .slice(0, MAX_SERIES);
    chart = (
      <PieChart>
        <Tooltip content={<ChartTooltip />} />
        {legend}
        <Pie data={slices} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="82%" paddingAngle={1} stroke={SURFACE} strokeWidth={2}>
          {slices.map((slice, i) => (
            <Cell key={slice.name} fill={SERIES[i]} />
          ))}
        </Pie>
      </PieChart>
    );
  } else {
    chart = (
      <BarChart {...common} barCategoryGap="24%" barGap={2}>
        {grid}
        <XAxis dataKey={xKey} {...axisProps} />
        {yAxis}
        {tooltip}
        {legend}
        {series.map((s, i) => (
          <Bar
            key={s}
            dataKey={s}
            fill={SERIES[i]}
            maxBarSize={24}
            stackId={stacked ? 'stack' : undefined}
            // Only the top of a stack is rounded; the 2px surface stroke is the gap between segments.
            radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
            stroke={stacked ? SURFACE : undefined}
            strokeWidth={stacked ? 2 : 0}
          />
        ))}
      </BarChart>
    );
  }

  return (
    <figure className="rounded-xl border border-line bg-white p-4 shadow-card sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        {title ? <p className="font-medium text-ink">{title}</p> : <span />}
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
      {showData ? (
        <TableView csv={csv} header />
      ) : (
        <div style={{ height }} role="img" aria-label={title || `${chartType} chart of ${series.join(', ')} by ${xKey}`}>
          <ResponsiveContainer width="100%" height="100%">
            {chart}
          </ResponsiveContainer>
        </div>
      )}
      {allSeries.length > MAX_SERIES && (
        <p className="mt-2 text-xs text-muted">Only the first {MAX_SERIES} series are drawn; all columns are in the data view.</p>
      )}
      {caption && <figcaption className="mt-4 text-sm text-muted">{caption}</figcaption>}
    </figure>
  );
}
