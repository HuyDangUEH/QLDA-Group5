import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps, type TooltipValueType } from 'recharts';
import type { SalesReport } from '@/types/vendor';
import { formatCurrency } from '@/lib/utils';

/** Màu cột: brand-500 (đã kiểm tra tương phản ≥ 3:1 trên nền trắng) */
const BAR_COLOR = '#f9603b';
const GRID_COLOR = '#eceef2';
const AXIS_TEXT = '#6a82ba'; // navy-400

/** 125000 → "125K", 1200000 → "1,2Tr" */
const compactVnd = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}Tr` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v);

const shortDate = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;

interface Point {
  date: string;
  label: string;
  revenue: number;
  orders: number;
  completed: number;
}

function ChartTooltip({ active, payload }: TooltipContentProps<TooltipValueType, string | number>) {
  const point = active ? (payload?.[0]?.payload as Point | undefined) : undefined;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-navy-900">{shortDate(point.date)}</p>
      <p className="mt-1 flex items-center gap-2 text-navy-700">
        <span className="size-2.5 rounded-sm" style={{ background: BAR_COLOR }} aria-hidden />
        Doanh thu: <span className="font-semibold tabular-nums">{formatCurrency(point.revenue)}</span>
      </p>
      <p className="text-navy-500">
        {point.completed}/{point.orders} đơn hoàn thành
      </p>
    </div>
  );
}

/** Biểu đồ cột doanh thu theo ngày (một chuỗi dữ liệu → không cần chú thích, tiêu đề đã nói rõ) */
export function RevenueChart({ series }: { series: SalesReport['series'] }) {
  const data: Point[] = series.map((d) => ({ ...d, label: shortDate(d.date), revenue: Number(d.revenue) }));
  // Nhiều ngày → giãn nhãn trục X để không chồng chữ
  const interval = data.length > 45 ? Math.ceil(data.length / 12) - 1 : data.length > 14 ? 'preserveStartEnd' : 0;

  return (
    <div className="h-72 w-full" role="img" aria-label={`Biểu đồ cột doanh thu theo ngày, ${data.length} ngày. Xem bảng số liệu bên dưới để có giá trị chi tiết.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={1} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: GRID_COLOR }} tick={{ fill: AXIS_TEXT, fontSize: 12 }} interval={interval} minTickGap={8} />
          <YAxis
            tickFormatter={compactVnd}
            tickLine={false}
            axisLine={false}
            tick={{ fill: AXIS_TEXT, fontSize: 12 }}
            width={48}
            allowDecimals={false}
          />
          <Tooltip content={ChartTooltip} cursor={{ fill: '#f3f4f6' }} />
          <Bar dataKey="revenue" fill={BAR_COLOR} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
