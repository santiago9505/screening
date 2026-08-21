import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronRight,
  Gauge,
  LineChart,
  X,
} from 'lucide-react';
import { Stock, StockFundamentals } from '../types';
import SetupPanel from './SetupPanel';

interface StockDetailPanelProps {
  stock: Stock;
  fundamentals: StockFundamentals | null;
  fundamentalsLoading: boolean;
  fundamentalsError: string | null;
  onClose: () => void;
  onOpenFundamentals: () => void;
  onSetupSaved: () => void;
}

const formatCompact = (value?: number | null, currency = false): string => {
  if (!Number.isFinite(Number(value))) return '—';
  const number = Number(value);
  const prefix = currency ? '$' : '';
  if (Math.abs(number) >= 1e12) return `${prefix}${(number / 1e12).toFixed(2)}T`;
  if (Math.abs(number) >= 1e9) return `${prefix}${(number / 1e9).toFixed(1)}B`;
  if (Math.abs(number) >= 1e6) return `${prefix}${(number / 1e6).toFixed(1)}M`;
  return `${prefix}${number.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
};

const MetricRow = ({ label, value, positive }: { label: string; value: string; positive?: boolean | null }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.05] last:border-b-0">
    <span className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{label}</span>
    <span className={`font-mono text-xs font-semibold ${positive === true ? 'text-emerald-300' : positive === false ? 'text-rose-300' : 'text-slate-200'}`}>
      {value}
    </span>
  </div>
);

export default function StockDetailPanel({
  stock,
  fundamentals,
  fundamentalsLoading,
  fundamentalsError,
  onClose,
  onOpenFundamentals,
  onSetupSaved,
}: StockDetailPanelProps) {
  const isPositive = stock.changePercent >= 0;
  const annualHigh = stock.price52WeekHigh || 0;
  const distanceFromHigh = annualHigh > 0 ? ((annualHigh - stock.price) / annualHigh) * 100 : null;
  const trendChecks = [stock.sma20, stock.sma50, stock.sma150, stock.sma200].filter((average) => average > 0);
  const positiveTrendChecks = trendChecks.filter((average) => stock.price > average).length;
  const trendScore = trendChecks.length ? Math.round((positiveTrendChecks / trendChecks.length) * 100) : 0;
  const summary = stock.fundamentals;

  return (
    <aside className="detail-panel w-[326px] shrink-0 overflow-y-auto border-l border-white/[0.07] bg-[#0c1118]">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0c1118]/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          <Gauge size={13} /> Intelligence panel
        </div>
        <button onClick={onClose} className="icon-button" title="Ocultar panel" aria-label="Ocultar panel de información">
          <X size={15} />
        </button>
      </div>

      <div className="p-4">
        <div className="mb-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-2xl font-semibold tracking-tight text-white">{stock.symbol}</h2>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                  {stock.sector || 'Equity'}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{stock.name}</p>
            </div>
            <span className={`flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[11px] font-semibold ${isPositive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
              {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div className="font-mono text-3xl font-medium tracking-tight text-white">${stock.price.toFixed(2)}</div>
            <div className="pb-1 text-right text-[10px] uppercase tracking-wider text-slate-600">USD · Daily</div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="metric-tile">
            <span>RS Rating</span>
            <strong className={stock.relativeStrength >= 80 ? 'text-emerald-300' : 'text-slate-100'}>{Math.round(stock.relativeStrength)}</strong>
            <small>{stock.relativeStrength >= 80 ? 'Liderazgo' : 'Mercado'}</small>
          </div>
          <div className="metric-tile">
            <span>Trend health</span>
            <strong className={trendScore >= 75 ? 'text-emerald-300' : trendScore >= 50 ? 'text-amber-300' : 'text-rose-300'}>{trendScore}</strong>
            <small>{positiveTrendChecks}/{trendChecks.length || 4} medias</small>
          </div>
        </div>

        <section className="detail-section">
          <div className="detail-section-title"><LineChart size={13} /> Estructura técnica</div>
          <MetricRow label="SMA 20" value={stock.sma20 > 0 ? `$${stock.sma20.toFixed(2)}` : '—'} positive={stock.sma20 > 0 ? stock.price > stock.sma20 : null} />
          <MetricRow label="SMA 50" value={stock.sma50 > 0 ? `$${stock.sma50.toFixed(2)}` : '—'} positive={stock.sma50 > 0 ? stock.price > stock.sma50 : null} />
          <MetricRow label="SMA 150" value={stock.sma150 > 0 ? `$${stock.sma150.toFixed(2)}` : '—'} positive={stock.sma150 > 0 ? stock.price > stock.sma150 : null} />
          <MetricRow label="SMA 200" value={stock.sma200 > 0 ? `$${stock.sma200.toFixed(2)}` : '—'} positive={stock.sma200 > 0 ? stock.price > stock.sma200 : null} />
          <MetricRow label="Desde máximo 52S" value={distanceFromHigh !== null ? `-${Math.max(0, distanceFromHigh).toFixed(1)}%` : '—'} positive={distanceFromHigh !== null ? distanceFromHigh <= 10 : null} />
        </section>

        <section className="detail-section mt-3">
          <div className="detail-section-title"><Building2 size={13} /> Calidad fundamental</div>
          <MetricRow label="Capitalización" value={formatCompact(stock.marketCap, true)} />
          <MetricRow label="P / E" value={stock.peRatio ? stock.peRatio.toFixed(1) : '—'} />
          <MetricRow label="EPS YoY" value={Number.isFinite(summary?.epsGrowth) ? `${Number(summary?.epsGrowth).toFixed(1)}%` : '—'} positive={Number.isFinite(summary?.epsGrowth) ? Number(summary?.epsGrowth) > 0 : null} />
          <MetricRow label="Ingresos YoY" value={Number.isFinite(summary?.revenueGrowth) ? `${Number(summary?.revenueGrowth).toFixed(1)}%` : '—'} positive={Number.isFinite(summary?.revenueGrowth) ? Number(summary?.revenueGrowth) > 0 : null} />
          <MetricRow label="Margen neto" value={Number.isFinite(summary?.netMargin) ? `${Number(summary?.netMargin).toFixed(1)}%` : '—'} positive={Number.isFinite(summary?.netMargin) ? Number(summary?.netMargin) > 10 : null} />
        </section>

        {fundamentalsLoading && <div className="mt-3 text-xs text-slate-500">Sincronizando trimestres…</div>}
        {!fundamentalsLoading && fundamentalsError && <div className="mt-3 rounded-lg border border-amber-400/15 bg-amber-400/[0.06] p-2.5 text-[11px] leading-5 text-amber-200/80">{fundamentalsError}</div>}
        {fundamentals?.quarterlyData?.length ? (
          <button onClick={onOpenFundamentals} className="secondary-action mt-3 w-full">
            <BarChart3 size={14} /> Abrir historial fundamental <ChevronRight size={14} className="ml-auto" />
          </button>
        ) : null}

        <SetupPanel stock={stock} onSaved={onSetupSaved} />
      </div>
    </aside>
  );
}
