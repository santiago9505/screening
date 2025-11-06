import React, { useState, useRef, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Loader } from 'lucide-react';
import { Stock } from '../types';

interface StockSidebarProps {
  stocks: Stock[];
  selectedStock: Stock | null;
  onSelectStock: (stock: Stock) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  totalStocks?: number;
}

const StockSidebar: React.FC<StockSidebarProps> = ({ 
  stocks, 
  selectedStock, 
  onSelectStock,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  totalStocks = 0
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detectar scroll al final para cargar más
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !onLoadMore) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;

      if (isNearBottom && hasMore && !loadingMore) {
        onLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, onLoadMore]);

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRSColor = (rs: number) => {
    if (rs >= 90) return 'text-green-400 bg-green-400/20';
    if (rs >= 70) return 'text-blue-400 bg-blue-400/20';
    if (rs >= 50) return 'text-yellow-400 bg-yellow-400/20';
    return 'text-red-400 bg-red-400/20';
  };

  return (
    <div className="w-80 bg-dark-200 border-r border-gray-700 flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar símbolo o nombre..."
            className="w-full bg-dark-100 text-white pl-9 pr-3 py-2 rounded-lg border border-gray-600 focus:border-accent-blue focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Stock List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {filteredStocks.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No se encontraron acciones
          </div>
        ) : (
          <>
            {filteredStocks.map((stock) => {
            const isSelected = selectedStock?.symbol === stock.symbol;
            const changePercent = ((stock.price - stock.prevClose) / stock.prevClose) * 100;
            const isPositive = changePercent >= 0;

            return (
              <div
                key={stock.symbol}
                onClick={() => onSelectStock(stock)}
                className={`px-3 py-2.5 border-b border-gray-800 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-accent-blue/20 border-l-4 border-l-accent-blue'
                    : 'hover:bg-dark-300'
                }`}
              >
                {/* Symbol & Name */}
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{stock.symbol}</div>
                    <div className="text-xs text-gray-400 truncate">{stock.name}</div>
                  </div>
                  
                  {/* RS Badge */}
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold ${getRSColor(stock.relativeStrength)}`}>
                    RS {stock.relativeStrength}
                  </span>
                </div>

                {/* Price & Change */}
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium text-sm">
                    ${stock.price.toFixed(2)}
                  </span>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    isPositive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                  </div>
                </div>

                {/* MA Position Indicators */}
                <div className="flex gap-1 mt-1.5">
                  {stock.price > stock.sma20 && (
                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                      SMA20
                    </span>
                  )}
                  {stock.price > stock.sma50 && (
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                      SMA50
                    </span>
                  )}
                  {stock.price > stock.sma200 && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                      SMA200
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Loading indicator cuando se cargan más acciones */}
          {loadingMore && (
            <div className="p-4 text-center">
              <Loader className="animate-spin text-accent-blue mx-auto" size={24} />
              <p className="text-xs text-gray-400 mt-2">Cargando más acciones...</p>
            </div>
          )}
          
          {/* Mostrar que hay más acciones disponibles */}
          {hasMore && !loadingMore && (
            <div className="p-4 text-center">
              <p className="text-xs text-gray-500">
                Desplázate para cargar más...
              </p>
            </div>
          )}
          </>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-700 bg-dark-100">
        <div className="text-xs text-gray-400 text-center">
          {filteredStocks.length} {filteredStocks.length === 1 ? 'acción' : 'acciones'}
          {totalStocks > 0 && totalStocks > filteredStocks.length && (
            <span className="ml-1">de {totalStocks.toLocaleString()} totales</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockSidebar;
