import React, { useState } from 'react';
import { Filter, X, Loader } from 'lucide-react';
import { Stock } from '../types';
import { stockDataService } from '../services/stockDataYahoo';

export interface FilterCriteria {
  minPrice?: number;
  maxPrice?: number;
  minRS?: number;
  maxRS?: number;
  minVolume?: number;
  aboveSMA50?: boolean;
  aboveSMA150?: boolean;
  aboveSMA200?: boolean;
  aboveEMA20?: boolean;
  aboveEMA50?: boolean;
  priceChangeMin?: number;
  priceChangeMax?: number;
  epsGrowthMin?: number;
  revenueGrowthMin?: number;
  grossMarginMin?: number;
  operatingMarginMin?: number;
  netMarginMin?: number;
  requireFundamentals?: boolean;
}

interface StockFiltersProps {
  onApplyFilters: (criteria: FilterCriteria, results?: Stock[], watchlistName?: string) => void;
  onClose: () => void;
  isCreatingWatchlist?: boolean;
}

export const StockFilters: React.FC<StockFiltersProps> = ({ onApplyFilters, onClose, isCreatingWatchlist = false }) => {
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [isScreening, setIsScreening] = useState(false);
  const [screeningProgress, setScreeningProgress] = useState('');
  const [watchlistName, setWatchlistName] = useState('');

  const handleApply = async () => {
    // Validar nombre de watchlist si es necesario
    if (isCreatingWatchlist && !watchlistName.trim()) {
      alert('Por favor ingresa un nombre para la lista');
      return;
    }

    setIsScreening(true);
    setScreeningProgress('Iniciando screening de todas las acciones del mercado...');
    
    try {
      // Limpiar filtros: remover valores undefined, null y NaN
      const cleanFilters: any = {};
      Object.keys(filters).forEach((key) => {
        const value = filters[key as keyof FilterCriteria];
        if (value !== undefined && value !== null && !Number.isNaN(value)) {
          cleanFilters[key] = value;
        }
      });
      
      console.log('[screen] Filtros a aplicar:', cleanFilters);
      
      // El servicio usa el motor local cuando está disponible y TradingView directo en la web.
      const results = await stockDataService.screenStocks(cleanFilters);
      
      setScreeningProgress(`Completado: ${results.length} acciones encontradas`);
      
      // Esperar un momento para que el usuario vea el mensaje
      setTimeout(() => {
        onApplyFilters(cleanFilters, results, isCreatingWatchlist ? watchlistName.trim() : undefined);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error en screening:', error);
      setScreeningProgress('Error al realizar el screening');
      setIsScreening(false);
    }
  };

  const handleReset = () => {
    setFilters({});
    onApplyFilters({});
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-200 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-200 border-b border-gray-700 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter className="text-accent-blue" size={24} />
            <h2 className="text-xl font-bold text-white">Filtros Avanzados</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Nombre de la lista (solo si se está creando watchlist) */}
          {isCreatingWatchlist && (
            <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-accent-blue mb-3">Nombre de la lista</h3>
              <input
                type="text"
                value={watchlistName}
                onChange={(e) => setWatchlistName(e.target.value)}
                placeholder="Ej: Acciones Momentum RS > 80"
                className="w-full bg-dark-300 text-white px-3 py-2.5 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2">
                Las acciones que cumplan los filtros se agregarán automáticamente a esta lista
              </p>
            </div>
          )}

          {/* Filtros de Precio */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Precio</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Precio mínimo ($)</label>
                <input
                  type="number"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Ej: 10"
                  className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Precio máximo ($)</label>
                <input
                  type="number"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Ej: 500"
                  className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Filtros de Relative Strength */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Relative Strength (RS)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">RS mínimo</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minRS || ''}
                  onChange={(e) => setFilters({ ...filters, minRS: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Ej: 70"
                  className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">RS máximo</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.maxRS || ''}
                  onChange={(e) => setFilters({ ...filters, maxRS: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Ej: 100"
                  className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Filtros de Cambio de Precio */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Cambio de precio (%)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Cambio mínimo (%)</label>
                <input
                  type="number"
                  value={filters.priceChangeMin || ''}
                  onChange={(e) => setFilters({ ...filters, priceChangeMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Ej: -10"
                  className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Cambio máximo (%)</label>
                <input
                  type="number"
                  value={filters.priceChangeMax || ''}
                  onChange={(e) => setFilters({ ...filters, priceChangeMax: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Ej: 10"
                  className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Filtros de Volumen */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Volumen</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Volumen mínimo (millones)</label>
              <input
                type="number"
                value={filters.minVolume || ''}
                onChange={(e) => setFilters({ ...filters, minVolume: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="Ej: 1 (1M de volumen)"
                className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Filtros Fundamentales */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Fundamentales</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.requireFundamentals || false}
                  onChange={(e) => setFilters({ ...filters, requireFundamentals: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-accent-blue focus:ring-accent-blue focus:ring-2"
                />
                <span className="text-white">Solo acciones con fundamentales disponibles</span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">EPS Growth Min (%)</label>
                  <input
                    type="number"
                    value={filters.epsGrowthMin || ''}
                    onChange={(e) => setFilters({ ...filters, epsGrowthMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Ej: 25"
                    className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Revenue Growth Min (%)</label>
                  <input
                    type="number"
                    value={filters.revenueGrowthMin || ''}
                    onChange={(e) => setFilters({ ...filters, revenueGrowthMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Ej: 20"
                    className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Gross Margin Min (%)</label>
                  <input
                    type="number"
                    value={filters.grossMarginMin || ''}
                    onChange={(e) => setFilters({ ...filters, grossMarginMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Ej: 35"
                    className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Operating Margin Min (%)</label>
                  <input
                    type="number"
                    value={filters.operatingMarginMin || ''}
                    onChange={(e) => setFilters({ ...filters, operatingMarginMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Ej: 15"
                    className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Net Margin Min (%)</label>
                  <input
                    type="number"
                    value={filters.netMarginMin || ''}
                    onChange={(e) => setFilters({ ...filters, netMarginMin: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="Ej: 10"
                    className="w-full bg-dark-300 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filtros de medias móviles */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Medias móviles</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.aboveSMA50 || false}
                  onChange={(e) => setFilters({ ...filters, aboveSMA50: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-accent-blue focus:ring-accent-blue focus:ring-2"
                />
                <span className="text-white">Precio por encima de SMA 50</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.aboveSMA150 || false}
                  onChange={(e) => setFilters({ ...filters, aboveSMA150: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-accent-blue focus:ring-accent-blue focus:ring-2"
                />
                <span className="text-white">Precio por encima de SMA 150</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.aboveSMA200 || false}
                  onChange={(e) => setFilters({ ...filters, aboveSMA200: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-accent-blue focus:ring-accent-blue focus:ring-2"
                />
                <span className="text-white">Precio por encima de SMA 200</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.aboveEMA20 || false}
                  onChange={(e) => setFilters({ ...filters, aboveEMA20: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-accent-blue focus:ring-accent-blue focus:ring-2"
                />
                <span className="text-white">Precio por encima de EMA 20</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.aboveEMA50 || false}
                  onChange={(e) => setFilters({ ...filters, aboveEMA50: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-accent-blue focus:ring-accent-blue focus:ring-2"
                />
                <span className="text-white">Precio por encima de EMA 50</span>
              </label>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="sticky bottom-0 bg-dark-200 border-t border-gray-700 p-4">
          {isScreening ? (
            <div className="text-center">
              <Loader className="animate-spin text-accent-blue mx-auto mb-2" size={32} />
              <p className="text-sm text-gray-400">{screeningProgress}</p>
              <p className="text-xs text-gray-500 mt-2">
                Esto puede tardar 1-2 minutos para escanear todas las acciones del mercado
              </p>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-dark-300 hover:bg-dark-100 text-white rounded-lg transition-colors"
              >
                Limpiar Filtros
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-4 py-2 bg-accent-blue hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold"
              >
                Escanear todas las acciones
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

 // Función para aplicar filtros a la lista de acciones
export const applyFilters = (stocks: Stock[], criteria: FilterCriteria): Stock[] => {
  return stocks.filter(stock => {
    // Filtro de precio mínimo
    if (criteria.minPrice !== undefined && stock.price < criteria.minPrice) {
      return false;
    }
    
    // Filtro de precio máximo
    if (criteria.maxPrice !== undefined && stock.price > criteria.maxPrice) {
      return false;
    }
    
    // Filtro de RS mínimo
    if (criteria.minRS !== undefined && stock.relativeStrength < criteria.minRS) {
      return false;
    }
    
    // Filtro de RS máximo
    if (criteria.maxRS !== undefined && stock.relativeStrength > criteria.maxRS) {
      return false;
    }
    
    // Filtro de cambio de precio mínimo
    if (criteria.priceChangeMin !== undefined && stock.changePercent < criteria.priceChangeMin) {
      return false;
    }
    
    // Filtro de cambio de precio máximo
    if (criteria.priceChangeMax !== undefined && stock.changePercent > criteria.priceChangeMax) {
      return false;
    }
    
    // Filtro de volumen mínimo (en millones)
    if (criteria.minVolume !== undefined && (stock.volume / 1000000) < criteria.minVolume) {
      return false;
    }
    
    // Filtro por encima de SMA 50
    if (criteria.aboveSMA50 && stock.price <= stock.sma50) {
      return false;
    }
    
    // Filtro por encima de SMA 150
    if (criteria.aboveSMA150 && stock.price <= stock.sma150) {
      return false;
    }
    
    // Filtro por encima de SMA 200
    if (criteria.aboveSMA200 && stock.price <= stock.sma200) {
      return false;
    }
    
    // Filtro por encima de EMA 20
    if (criteria.aboveEMA20 && stock.price <= stock.ema20) {
      return false;
    }
    
    // Filtro por encima de EMA 50
    if (criteria.aboveEMA50 && stock.price <= stock.ema50) {
      return false;
    }

    const fundamentals = stock.fundamentals;
    const hasFundamentals = Boolean(fundamentals && fundamentals.hasFundamentals);

    if (criteria.requireFundamentals && !hasFundamentals) {
      return false;
    }

    if (criteria.epsGrowthMin !== undefined && (!hasFundamentals || (fundamentals?.epsGrowth ?? Number.NEGATIVE_INFINITY) < criteria.epsGrowthMin)) {
      return false;
    }

    if (criteria.revenueGrowthMin !== undefined && (!hasFundamentals || (fundamentals?.revenueGrowth ?? Number.NEGATIVE_INFINITY) < criteria.revenueGrowthMin)) {
      return false;
    }

    if (criteria.grossMarginMin !== undefined && (!hasFundamentals || (fundamentals?.grossMargin ?? Number.NEGATIVE_INFINITY) < criteria.grossMarginMin)) {
      return false;
    }

    if (criteria.operatingMarginMin !== undefined && (!hasFundamentals || (fundamentals?.operatingMargin ?? Number.NEGATIVE_INFINITY) < criteria.operatingMarginMin)) {
      return false;
    }

    if (criteria.netMarginMin !== undefined && (!hasFundamentals || (fundamentals?.netMargin ?? Number.NEGATIVE_INFINITY) < criteria.netMarginMin)) {
      return false;
    }
    
    return true;
  });
};
