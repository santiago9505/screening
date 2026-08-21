import { QuarterlyData } from '../types';

interface FundamentalsViewProps {
  symbol: string;
  quarterlyData: QuarterlyData[];
  source?: string;
  updatedAt?: string;
  onClose: () => void;
}

const isFiniteNumber = (value: number | null | undefined): value is number => Number.isFinite(value);

const formatCurrency = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toFixed(0)}`;
};

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const growthClass = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value)) return 'text-gray-500';
  if (value >= 20) return 'text-emerald-300';
  if (value >= 0) return 'text-green-300';
  if (value > -15) return 'text-amber-300';
  return 'text-red-300';
};

const formatGrowth = (value: number | null | undefined, decimals = 1): string => {
  if (!isFiniteNumber(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

const formatPercent = (value: number | null | undefined): string => (
  isFiniteNumber(value) ? `${value.toFixed(1)}%` : '—'
);

const formatEps = (value: number | null | undefined): string => (
  isFiniteNumber(value) ? `$${value.toFixed(2)}` : '—'
);

export const FundamentalsView: React.FC<FundamentalsViewProps> = ({
  symbol,
  quarterlyData,
  source,
  updatedAt,
  onClose
}) => {
  const rows = [...quarterlyData].slice(-12).reverse();
  const epsGrowthValues = rows.map((row) => row.epsGrowth).filter(isFiniteNumber);
  const revenueGrowthValues = rows.map((row) => row.revenueGrowth).filter(isFiniteNumber);
  const avgEpsGrowth = epsGrowthValues.length > 0
    ? epsGrowthValues.reduce((sum, value) => sum + value, 0) / epsGrowthValues.length
    : null;
  const avgRevenueGrowth = revenueGrowthValues.length > 0
    ? revenueGrowthValues.reduce((sum, value) => sum + value, 0) / revenueGrowthValues.length
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-xl border border-gray-700 bg-dark-200 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700 bg-dark-200 p-5">
          <div>
            <h2 className="text-2xl font-bold text-white">{symbol}</h2>
            <p className="mt-1 text-sm text-gray-400">
              Fundamentales trimestrales calendarizados por fecha de cierre
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Fuente: {source || 'finnhub'} {updatedAt ? `| Actualizado: ${formatDate(updatedAt)}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-dark-300 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-gray-700 bg-dark-100 p-3">
              <div className="text-xs text-gray-400">Crecimiento EPS promedio</div>
              <div className={`text-xl font-bold ${growthClass(avgEpsGrowth)}`}>
                {formatGrowth(avgEpsGrowth)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-dark-100 p-3">
              <div className="text-xs text-gray-400">Crecimiento de ingresos promedio</div>
              <div className={`text-xl font-bold ${growthClass(avgRevenueGrowth)}`}>
                {formatGrowth(avgRevenueGrowth)}
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-dark-100 p-3">
              <div className="text-xs text-gray-400">Ultimo periodo disponible</div>
              <div className="text-xl font-bold text-white">
                {rows[0] ? `${rows[0].quarter} ${rows[0].year}` : '-'}
              </div>
              <div className="text-xs text-gray-500">
                {rows[0] ? `Cierre ${formatDate(rows[0].periodEnd)}` : ''}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full min-w-[1240px]">
              <thead className="bg-dark-100">
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Periodo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Cierre</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">EPS</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">EPS YoY</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Ingresos</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Ingresos YoY</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Margen Bruto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Gasto médico / primas</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">SG&A / ingresos</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Margen Op.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Margen Neto</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Etiqueta Fiscal</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={`${q.periodEnd}-${q.quarter}-${q.year}`} className="border-b border-gray-800/80">
                    <td className="px-4 py-3 text-sm font-semibold text-white">{q.quarter} {q.year}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{formatDate(q.periodEnd)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white" title={q.epsBasis === 'derived-from-filing' ? 'Derivado desde utilidad atribuible y acciones promedio' : undefined}>{formatEps(q.eps)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${growthClass(q.epsGrowth)}`}>
                      {formatGrowth(q.epsGrowth)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">{formatCurrency(q.revenue)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${growthClass(q.revenueGrowth)}`}>
                      {formatGrowth(q.revenueGrowth)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-300">{formatPercent(q.grossMargin)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-300">{formatPercent(q.medicalExpenseRatio)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-amber-300">{formatPercent(q.sgaExpenseRatio)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-cyan-300">{formatPercent(q.operatingMargin)}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-blue-300">{formatPercent(q.netMargin)}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {q.fiscalYear && q.fiscalQuarter ? `FY${q.fiscalYear} Q${q.fiscalQuarter}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
