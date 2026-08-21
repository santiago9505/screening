import { BarChart3, Loader } from 'lucide-react';
import { StockFundamentalSummary, StockFundamentals } from '../types';

interface FundamentalsStripProps {
  fundamentals?: StockFundamentals | null;
  summary?: StockFundamentalSummary;
  compact?: boolean;
  loading?: boolean;
  onOpenHistory?: () => void;
}

const isFiniteNumber = (value: number | null | undefined): value is number => Number.isFinite(value);

const formatCurrencyCompact = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toFixed(0)}`;
};

const growthClass = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value)) return 'border-gray-700 bg-gray-800/70 text-gray-500';
  if (value >= 20) return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/20';
  if (value >= 0) return 'text-green-300 bg-green-500/10 border-green-500/20';
  if (value > -15) return 'text-amber-300 bg-amber-500/10 border-amber-500/20';
  return 'text-red-300 bg-red-500/10 border-red-500/20';
};

const formatGrowth = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value)) return 's/d';
  return `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
};

const formatPercent = (value: number | null | undefined): string => (
  isFiniteNumber(value) ? `${value.toFixed(1)}%` : '—'
);

const formatEps = (value: number | null | undefined): string => (
  isFiniteNumber(value) ? `$${value.toFixed(2)}` : '—'
);

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-MX', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
};

export default function FundamentalsStrip({
  fundamentals,
  summary,
  compact = false,
  loading = false,
  onOpenHistory,
}: FundamentalsStripProps) {
  const periods = [...(fundamentals?.quarterlyData || [])].slice(-6);

  if (compact) {
    const compactPeriods = periods.slice(-5);
    const sourceLabel = fundamentals?.source || (summary?.hasFundamentals ? 'TradingView · TTM' : 'Cobertura pendiente');

    return (
      <section className="fundamentals-dock" aria-label="Fundamentales siempre visibles">
        <div className="fundamentals-dock-header">
          <div>
            <span>Fundamentales</span>
            <b>{compactPeriods.length ? `${compactPeriods.length} trimestres recientes` : 'Resumen TTM'}</b>
          </div>
          <span className="fundamentals-source-badge">{sourceLabel}</span>
          {loading && <span className="fundamentals-sync"><Loader className="animate-spin" size={11} /> Sincronizando</span>}
          {compactPeriods.length > 0 && onOpenHistory ? (
            <button onClick={onOpenHistory}><BarChart3 size={11} /> Historial completo</button>
          ) : null}
        </div>

        <div className="fundamentals-dock-track">
          {compactPeriods.length > 0 ? compactPeriods.map((quarter) => (
            <article key={`${quarter.periodEnd}-${quarter.quarter}-${quarter.year}`} className="fundamentals-quarter-card">
              <header>
                <strong>{quarter.quarter} {quarter.year}</strong>
                <span>{formatDate(quarter.periodEnd)}</span>
              </header>
              <div className="fundamentals-quarter-metrics">
                <div><span>EPS</span><b>{formatEps(quarter.eps)}</b><i className={growthClass(quarter.epsGrowth)}>{formatGrowth(quarter.epsGrowth)}</i></div>
                <div><span>Ventas</span><b>{formatCurrencyCompact(quarter.revenue)}</b><i className={growthClass(quarter.revenueGrowth)}>{formatGrowth(quarter.revenueGrowth)}</i></div>
                <div><span>Margen op.</span><b>{formatPercent(quarter.operatingMargin)}</b></div>
                <div><span>Margen neto</span><b>{formatPercent(quarter.netMargin)}</b></div>
              </div>
            </article>
          )) : (
            <>
              <div className="fundamentals-summary-metric"><span>EPS YoY</span><b>{formatGrowth(summary?.epsGrowth)}</b><small>{formatEps(summary?.eps)}</small></div>
              <div className="fundamentals-summary-metric"><span>Ventas YoY</span><b>{formatGrowth(summary?.revenueGrowth)}</b><small>{formatCurrencyCompact(summary?.revenue)}</small></div>
              <div className="fundamentals-summary-metric"><span>Margen bruto</span><b>{formatPercent(summary?.grossMargin)}</b><small>TTM</small></div>
              <div className="fundamentals-summary-metric"><span>Margen operativo</span><b>{formatPercent(summary?.operatingMargin)}</b><small>TTM</small></div>
              <div className="fundamentals-summary-metric"><span>Margen neto</span><b>{formatPercent(summary?.netMargin)}</b><small>TTM</small></div>
            </>
          )}
        </div>
      </section>
    );
  }

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
          Finnhub · XBRL
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
          const hasInsuranceMetrics = isFiniteNumber(q.medicalExpenseRatio);
          const primaryRatioLabel = hasInsuranceMetrics ? 'Gasto médico / primas' : 'Margen bruto';
          const primaryRatioValue = hasInsuranceMetrics ? q.medicalExpenseRatio : q.grossMargin;
          const secondaryRatioLabel = hasInsuranceMetrics ? 'SG&A / ingresos' : 'Margen operativo';
          const secondaryRatioValue = hasInsuranceMetrics ? q.sgaExpenseRatio : q.operatingMargin;

          return (
            <div
              key={`${q.periodEnd}-${q.quarter}-${q.year}`}
              className="min-w-[235px] rounded-lg border border-gray-700 bg-dark-100 p-3"
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
                <div className="text-right" title={q.epsBasis === 'derived-from-filing' ? 'EPS reconstruido desde utilidad atribuible y acciones promedio del filing' : 'EPS reportado o normalizado desde el filing'}>
                  <span className="font-semibold text-white">{formatEps(q.eps)}</span>
                  <span className={`ml-1 rounded border px-1 py-0.5 text-[10px] ${growthClass(q.epsGrowth)}`}>
                    {formatGrowth(q.epsGrowth)}
                  </span>
                </div>

                <span className="text-gray-400">Ingresos</span>
                <div className="text-right">
                  <span className="font-semibold text-white">{formatCurrencyCompact(q.revenue)}</span>
                  <span className={`ml-1 rounded border px-1 py-0.5 text-[10px] ${growthClass(q.revenueGrowth)}`}>
                    {formatGrowth(q.revenueGrowth)}
                  </span>
                </div>

                <span className="text-gray-400">{primaryRatioLabel}</span>
                <span className="text-right font-semibold text-emerald-300">{formatPercent(primaryRatioValue)}</span>

                <span className="text-gray-400">{secondaryRatioLabel}</span>
                <span className="text-right font-semibold text-cyan-300">{formatPercent(secondaryRatioValue)}</span>

                <span className="text-gray-400">Margen neto</span>
                <span className="text-right font-semibold text-blue-300">{formatPercent(q.netMargin)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
