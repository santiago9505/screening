import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, BarChart3 } from 'lucide-react';
import { SetupAnalyticsResponse } from '../types';
import { stockDataService } from '../services/stockDataYahoo';

interface SetupLabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SetupLabModal: React.FC<SetupLabModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<SetupAnalyticsResponse | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await stockDataService.getSetupAnalytics([5, 10, 20], 12);
        if (!cancelled) setAnalytics(data);
      } catch (loadError) {
        console.error('Error cargando setup analytics:', loadError);
        if (!cancelled) setError('No se pudieron cargar las estadísticas de setups.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const topTags = useMemo(() => {
    if (!analytics) return [];
    return analytics.tagStats.slice(0, 40);
  }, [analytics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-200 border border-gray-700 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 size={18} className="text-accent-blue" />
            <div>
              <h3 className="text-white font-semibold">Setup Lab</h3>
              <p className="text-xs text-gray-400">
                Rendimiento histórico por tag, incluso sin ejecución
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-dark-100 text-gray-300"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-auto">
          {loading && (
            <div className="py-16 text-center text-gray-400">
              <Loader2 className="animate-spin mx-auto mb-3" size={22} />
              Cargando estadísticas...
            </div>
          )}

          {!loading && error && (
            <div className="py-10 text-center text-red-300">{error}</div>
          )}

          {!loading && !error && analytics && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400">
                Snapshots: {analytics.snapshotDays} días | Rango: {analytics.fromDate || '-'} a {analytics.toDate || '-'}
              </div>

              {topTags.length === 0 && (
                <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] px-5 py-10 text-center">
                  <p className="text-sm font-medium text-slate-200">El laboratorio histórico usa tu motor privado</p>
                  <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-500">
                    En la versión web puedes evaluar setups y guardar feedback local. Abre la app de escritorio para analizar retornos históricos por tag.
                  </p>
                </div>
              )}

              {topTags.length > 0 && <div className="overflow-auto border border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-dark-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-400 uppercase">Tag</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-400 uppercase">Muestras</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-400 uppercase">Score Avg</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-400 uppercase">5D Avg / Win</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-400 uppercase">10D Avg / Win</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-400 uppercase">20D Avg / Win</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTags.map((row) => {
                      const h5 = row.horizons?.['5'];
                      const h10 = row.horizons?.['10'];
                      const h20 = row.horizons?.['20'];

                      const renderCell = (cell?: { avgReturn: number | null; winRate: number | null }) => {
                        if (!cell || cell.avgReturn === null || cell.winRate === null) {
                          return <span className="text-gray-500">-</span>;
                        }
                        const positive = cell.avgReturn >= 0;
                        return (
                          <span className={positive ? 'text-green-300' : 'text-red-300'}>
                            {cell.avgReturn.toFixed(2)}% / {cell.winRate.toFixed(1)}%
                          </span>
                        );
                      };

                      return (
                        <tr key={row.tag} className="border-t border-gray-800 hover:bg-dark-300/60">
                          <td className="px-3 py-2 text-gray-100 font-medium">{row.tag}</td>
                          <td className="px-3 py-2 text-right text-gray-300">{row.occurrences}</td>
                          <td className="px-3 py-2 text-right text-accent-blue">{row.avgScore ?? '-'}</td>
                          <td className="px-3 py-2 text-right">{renderCell(h5)}</td>
                          <td className="px-3 py-2 text-right">{renderCell(h10)}</td>
                          <td className="px-3 py-2 text-right">{renderCell(h20)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupLabModal;
