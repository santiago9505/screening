import React, { useState, useEffect } from 'react';
import { Stock, Watchlist, ScreenerFilters } from '../types';
import { Search, Filter, TrendingUp, ListPlus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface StockTableProps {
  stocks: Stock[];
  onStockSelect: (stock: Stock) => void;
  watchlists: Watchlist[];
  onAddToWatchlist: (symbol: string, watchlistId: string) => void;
}

type SortField = 'symbol' | 'price' | 'changePercent' | 'volume' | 'marketCap' | 'relativeStrength';
type SortDirection = 'asc' | 'desc';

export const StockTable: React.FC<StockTableProps> = ({ 
  stocks, 
  onStockSelect, 
  watchlists, 
  onAddToWatchlist 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('relativeStrength');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<ScreenerFilters>({});
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredStocks = stocks
    .filter(stock => {
      // Búsqueda por símbolo o nombre
      if (searchTerm && !stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !stock.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filtros de precio
      if (filters.priceMin && stock.price < filters.priceMin) return false;
      if (filters.priceMax && stock.price > filters.priceMax) return false;

      // Filtros de volumen y market cap
      if (filters.volumeMin && stock.volume < filters.volumeMin) return false;
      if (filters.marketCapMin && stock.marketCap < filters.marketCapMin) return false;

      // Filtros de medias móviles
      if (filters.aboveSMA20 && stock.price < stock.sma20) return false;
      if (filters.aboveSMA50 && stock.price < stock.sma50) return false;
      if (filters.aboveSMA200 && stock.price < stock.sma200) return false;

      // Filtro de RS
      if (filters.rsMin && stock.relativeStrength < filters.rsMin) return false;

      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const multiplier = sortDirection === 'asc' ? 1 : -1;
      return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * multiplier;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(decimals)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const getRSColor = (rs: number): string => {
    if (rs >= 80) return 'text-green-400 bg-green-400/10';
    if (rs >= 60) return 'text-blue-400 bg-blue-400/10';
    if (rs >= 40) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header con búsqueda y filtros */}
      <div className="bg-dark-200 p-4 border-b border-gray-700">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por símbolo o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-100 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-accent-blue text-white' : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
            }`}
          >
            <Filter size={18} />
            Filtros
          </button>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="mt-4 p-4 bg-dark-100 rounded-lg border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Precio Mínimo</label>
                <input
                  type="number"
                  placeholder="$0"
                  value={filters.priceMin || ''}
                  onChange={(e) => setFilters({ ...filters, priceMin: parseFloat(e.target.value) || undefined })}
                  className="w-full bg-dark-200 text-white px-3 py-2 rounded border border-gray-600 focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Precio Máximo</label>
                <input
                  type="number"
                  placeholder="Sin límite"
                  value={filters.priceMax || ''}
                  onChange={(e) => setFilters({ ...filters, priceMax: parseFloat(e.target.value) || undefined })}
                  className="w-full bg-dark-200 text-white px-3 py-2 rounded border border-gray-600 focus:border-accent-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">RS Mínimo</label>
                <input
                  type="number"
                  placeholder="0-100"
                  value={filters.rsMin || ''}
                  onChange={(e) => setFilters({ ...filters, rsMin: parseFloat(e.target.value) || undefined })}
                  className="w-full bg-dark-200 text-white px-3 py-2 rounded border border-gray-600 focus:border-accent-blue focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.aboveSMA20 || false}
                  onChange={(e) => setFilters({ ...filters, aboveSMA20: e.target.checked })}
                  className="w-4 h-4 rounded bg-dark-200 border-gray-600"
                />
                Sobre SMA 20
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.aboveSMA50 || false}
                  onChange={(e) => setFilters({ ...filters, aboveSMA50: e.target.checked })}
                  className="w-4 h-4 rounded bg-dark-200 border-gray-600"
                />
                Sobre SMA 50
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.aboveSMA200 || false}
                  onChange={(e) => setFilters({ ...filters, aboveSMA200: e.target.checked })}
                  className="w-4 h-4 rounded bg-dark-200 border-gray-600"
                />
                Sobre SMA 200
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-dark-200 sticky top-0 z-10">
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('symbol')}>
                <div className="flex items-center gap-1">
                  Símbolo <SortIcon field="symbol" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Nombre</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('price')}>
                <div className="flex items-center justify-end gap-1">
                  Precio <SortIcon field="price" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('changePercent')}>
                <div className="flex items-center justify-end gap-1">
                  Cambio % <SortIcon field="changePercent" />
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('relativeStrength')}>
                <div className="flex items-center justify-end gap-1">
                  RS <SortIcon field="relativeStrength" />
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Medias Móviles</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-white"
                  onClick={() => handleSort('marketCap')}>
                <div className="flex items-center justify-end gap-1">
                  Market Cap <SortIcon field="marketCap" />
                </div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((stock) => (
              <tr
                key={stock.symbol}
                className="border-b border-gray-800 hover:bg-dark-200 cursor-pointer transition-colors"
                onClick={() => onStockSelect(stock)}
              >
                <td className="px-4 py-3">
                  <span className="font-semibold text-white">{stock.symbol}</span>
                </td>
                <td className="px-4 py-3 text-gray-300 text-sm">{stock.name}</td>
                <td className="px-4 py-3 text-right font-semibold text-white">
                  ${stock.price.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${
                  stock.changePercent >= 0 ? 'text-accent-green' : 'text-accent-red'
                }`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <span className={`px-2 py-1 rounded text-sm font-bold ${getRSColor(stock.relativeStrength)}`}>
                      {stock.relativeStrength.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      stock.price > stock.sma20 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      20
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      stock.price > stock.sma50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      50
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      stock.price > stock.sma200 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      200
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-300">
                  {formatNumber(stock.marketCap)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStock(selectedStock === stock.symbol ? null : stock.symbol);
                      }}
                      className="p-1 hover:bg-dark-300 rounded transition-colors"
                      title="Agregar a watchlist"
                    >
                      <ListPlus size={18} className="text-gray-400 hover:text-accent-blue" />
                    </button>
                    {selectedStock === stock.symbol && (
                      <div className="absolute right-0 top-8 bg-dark-200 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[200px]">
                        {watchlists.map((wl) => (
                          <button
                            key={wl.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToWatchlist(stock.symbol, wl.id);
                              setSelectedStock(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-dark-300 first:rounded-t-lg last:rounded-b-lg transition-colors"
                          >
                            {wl.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer con estadísticas */}
      <div className="bg-dark-200 px-4 py-2 border-t border-gray-700 text-sm text-gray-400">
        Mostrando {filteredStocks.length} de {stocks.length} acciones
      </div>
    </div>
  );
};
