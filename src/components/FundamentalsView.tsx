import React from 'react';
import { QuarterlyData } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

interface FundamentalsViewProps {
  symbol: string;
  quarterlyData: QuarterlyData[];
  onClose: () => void;
}

export const FundamentalsView: React.FC<FundamentalsViewProps> = ({ 
  symbol, 
  quarterlyData, 
  onClose 
}) => {
  const formatCurrency = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  };

  const getGrowthColor = (growth: number): string => {
    if (growth >= 25) return 'text-green-500 bg-green-500/10';
    if (growth >= 0) return 'text-green-400 bg-green-400/10';
    if (growth >= -10) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-200 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-dark-200 border-b border-gray-700 p-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">{symbol}</h2>
            <p className="text-gray-400 text-sm mt-1">Datos Fundamentales Trimestrales</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 hover:bg-dark-300 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* EPS Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="text-accent-blue" size={24} />
              <h3 className="text-xl font-semibold text-white">Earnings Per Share (EPS)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {quarterlyData.slice(0, 4).map((q, index) => (
                <div key={index} className="bg-dark-100 rounded-lg p-4 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Q{q.quarter} {q.year}</div>
                  <div className="text-2xl font-bold text-white mb-2">
                    ${q.eps.toFixed(2)}
                  </div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold ${getGrowthColor(q.epsGrowth)}`}>
                    {q.epsGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {q.epsGrowth >= 0 ? '+' : ''}{q.epsGrowth.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-accent-green" size={24} />
              <h3 className="text-xl font-semibold text-white">Ventas (Revenue)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {quarterlyData.slice(0, 4).map((q, index) => (
                <div key={index} className="bg-dark-100 rounded-lg p-4 border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Q{q.quarter} {q.year}</div>
                  <div className="text-2xl font-bold text-white mb-2">
                    {formatCurrency(q.revenue)}
                  </div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold ${getGrowthColor(q.revenueGrowth)}`}>
                    {q.revenueGrowth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {q.revenueGrowth >= 0 ? '+' : ''}{q.revenueGrowth.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Margins Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Percent className="text-yellow-400" size={24} />
              <h3 className="text-xl font-semibold text-white">Márgenes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Trimestre</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Margen Bruto</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Margen Operativo</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Margen Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterlyData.slice(0, 4).map((q, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-dark-300 transition-colors">
                      <td className="py-3 px-4 text-white">Q{q.quarter} {q.year}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-green-400 font-semibold">{q.grossMargin.toFixed(1)}%</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-blue-400 font-semibold">{q.operatingMargin.toFixed(1)}%</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-yellow-400 font-semibold">{q.netMargin.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historical comparison */}
          <div className="mt-8 p-4 bg-dark-100 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-400 mb-3">ANÁLISIS DE CRECIMIENTO</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Crecimiento EPS Promedio</div>
                <div className="text-lg font-bold text-white">
                  {(quarterlyData.slice(0, 4).reduce((sum, q) => sum + q.epsGrowth, 0) / 4).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Crecimiento Ventas Promedio</div>
                <div className="text-lg font-bold text-white">
                  {(quarterlyData.slice(0, 4).reduce((sum, q) => sum + q.revenueGrowth, 0) / 4).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Margen Neto Promedio</div>
                <div className="text-lg font-bold text-white">
                  {(quarterlyData.slice(0, 4).reduce((sum, q) => sum + q.netMargin, 0) / 4).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
