"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BUCKET_SIZE = 10;

const REFERENCE_LINES = [
  { key: "p10", label: "Low", color: "#2563eb" },
  { key: "median", label: "Mid", color: "#16a34a" },
  { key: "p90", label: "High", color: "#dc2626" },
] as const;

type Comp = {
  sold_price: string | number;
};

type Stats = {
  p10: number;
  median: number;
  p90: number;
};

type HistogramBucket = {
  price: number;
  label: string;
  count: number;
};

function buildHistogram(prices: number[]): HistogramBucket[] {
  if (prices.length === 0) return [];

  const min =
    Math.floor(Math.min(...prices) / BUCKET_SIZE) * BUCKET_SIZE;
  const max =
    Math.ceil(Math.max(...prices) / BUCKET_SIZE) * BUCKET_SIZE;

  const buckets = new Map<number, number>();
  for (let price = min; price <= max; price += BUCKET_SIZE) {
    buckets.set(price, 0);
  }

  for (const price of prices) {
    const bucket = Math.floor(price / BUCKET_SIZE) * BUCKET_SIZE;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([price, count]) => ({
    price,
    label: `$${price}-$${price + BUCKET_SIZE}`,
    count,
  }));
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

type PriceChartProps = {
  comps: Comp[];
  stats: Stats;
};

export function PriceChart({ comps, stats }: PriceChartProps) {
  const prices = comps.map((comp) => Number(comp.sold_price));
  const data = buildHistogram(prices);

  if (data.length === 0) {
    return null;
  }

  const referenceValues = {
    p10: stats.p10,
    median: stats.median,
    p90: stats.p90,
  };

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
          <XAxis
            dataKey="price"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value) => `$${value}`}
            tick={{ fontSize: 12, fill: "#71717a" }}
            axisLine={{ stroke: "#e4e4e7" }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            label={{
              value: "Count",
              angle: -90,
              position: "insideLeft",
              fill: "#71717a",
              fontSize: 12,
            }}
          />
          <Tooltip
            formatter={(value) => [value ?? 0, "Sales"]}
            labelFormatter={(_, payload) => {
              const bucket = payload?.[0]?.payload as HistogramBucket | undefined;
              return bucket?.label ?? "";
            }}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e4e4e7",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
          {REFERENCE_LINES.map((line) => (
            <ReferenceLine
              key={line.key}
              x={referenceValues[line.key]}
              stroke={line.color}
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: line.label,
                position: "top",
                fill: line.color,
                fontSize: 12,
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-4 text-sm text-zinc-600">
        {REFERENCE_LINES.map((line) => (
          <div key={line.key} className="flex items-center gap-2">
            <span
              className="inline-block h-0 w-6 border-t-2 border-dashed"
              style={{ borderColor: line.color }}
            />
            <span>
              {line.label} ({formatPrice(referenceValues[line.key])})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
