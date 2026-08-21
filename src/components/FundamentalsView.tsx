import { QuarterlyData } from '../types';

interface FundamentalsViewProps {
  symbol: string;
  quarterlyData: QuarterlyData[];
  source?: string;
  updatedAt?: string;
  onClose: () => void;
}

const formatCurrency = (value: number): string => {
  if (!Number.isFinite(value)) return '-';
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

const growthClass = (value: number): string => {
  if (value >= 20) return 'text-emerald-300';
  if (value >= 0) return 'text-green-300';
  if (value > -15) return 'text-amber-300';
  return 'text-red-300';
};

export const FundamentalsView: React.FC<FundamentalsViewProps> = ({
  symbol,
  quarterlyData,
  source,
  updatedAt,
  onClose
}) => {
  const rows = [...quarterlyData].slice(-12).reverse();

  const avgEpsGrowth = rows.length > 0
    ? rows.reduce((sum, row) => sum + row.epsGrowth, 0) / rows.length
    : 0;
  const avgRevenueGrowth = rows.length > 0
    ? rows.reduce((sum, row) => sum + row.revenueGrowth, 0) / rows.length
    : 0;

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
                {avgEpsGrowth >= 0 ? '+' : ''}{avgEpsGrowth.toFixed(1)}%
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-dark-100 p-3">
              <div className="text-xs text-gray-400">Crecimiento ventas promedio</div>
              <div className={`text-xl font-bold ${growthClass(avgRevenueGrowth)}`}>
                {avgRevenueGrowth >= 0 ? '+' : ''}{avgRevenueGrowth.toFixed(1)}%
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
            <table className="w-full min-w-[980px]">
              <thead className="bg-dark-100">
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Periodo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Cierre</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">EPS</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">EPS YoY</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Ventas</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Ventas YoY</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Margen Bruto</th>
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
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">${q.eps.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${growthClass(q.epsGrowth)}`}>
                      {q.epsGrowth >= 0 ? '+' : ''}{q.epsGrowth.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">{formatCurrency(q.revenue)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${growthClass(q.revenueGrowth)}`}>
                      {q.revenueGrowth >= 0 ? '+' : ''}{q.revenueGrowth.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-300">{q.grossMargin.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-cyan-300">{q.operatingMargin.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-blue-300">{q.netMargin.toFixed(1)}%</td>
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
