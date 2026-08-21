import { StockFundamentals } from '../types';

interface FundamentalsStripProps {
  fundamentals: StockFundamentals;
}

const formatCurrencyCompact = (value: number): string => {
  if (!Number.isFinite(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toFixed(0)}`;
};

const growthClass = (value: number): string => {
  if (value >= 20) return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/20';
  if (value >= 0) return 'text-green-300 bg-green-500/10 border-green-500/20';
  if (value > -15) return 'text-amber-300 bg-amber-500/10 border-amber-500/20';
  return 'text-red-300 bg-red-500/10 border-red-500/20';
};

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-MX', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
};

export default function FundamentalsStrip({ fundamentals }: FundamentalsStripProps) {
  const periods = [...(fundamentals.quarterlyData || [])].slice(-6);

  if (periods.length === 0) {
    return null;
  }

  return (
    <div className="bg-dark-200 border-t border-gray-700 px-3 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-300">
          Fundamentales
        </span>
        <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-300">
          Finnhub
        </span>
        <span className="rounded-full border border-gray-600 px-2 py-0.5 text-[10px] text-gray-400">
          Periodo calendario por fecha de cierre
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {periods.map((q) => {
          const fiscalLabel =
            q.fiscalYear && q.fiscalQuarter
              ? `FY${q.fiscalYear} Q${q.fiscalQuarter}`
              : null;

          return (
            <div
              key={`${q.periodEnd}-${q.quarter}-${q.year}`}
              className="min-w-[210px] rounded-lg border border-gray-700 bg-dark-100 p-3"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">{q.quarter} {q.year}</div>
                  <div className="text-[11px] text-gray-500">Cierre: {formatDate(q.periodEnd)}</div>
                </div>
                {fiscalLabel && (
                  <span className="rounded-md bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                    {fiscalLabel}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
                <span className="text-gray-400">EPS</span>
                <div className="text-right">
                  <span className="font-semibold text-white">${q.eps.toFixed(2)}</span>
                  <span className={`ml-1 rounded border px-1 py-0.5 text-[10px] ${growthClass(q.epsGrowth)}`}>
                    {q.epsGrowth >= 0 ? '+' : ''}{q.epsGrowth.toFixed(0)}%
                  </span>
                </div>

                <span className="text-gray-400">Ventas</span>
                <div className="text-right">
                  <span className="font-semibold text-white">{formatCurrencyCompact(q.revenue)}</span>
                  <span className={`ml-1 rounded border px-1 py-0.5 text-[10px] ${growthClass(q.revenueGrowth)}`}>
                    {q.revenueGrowth >= 0 ? '+' : ''}{q.revenueGrowth.toFixed(0)}%
                  </span>
                </div>

                <span className="text-gray-400">Margen Bruto</span>
                <span className="text-right font-semibold text-emerald-300">{q.grossMargin.toFixed(1)}%</span>

                <span className="text-gray-400">Margen Neto</span>
                <span className="text-right font-semibold text-blue-300">{q.netMargin.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
