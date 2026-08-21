import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import { Stock } from '../types';

interface StockSidebarProps {
  stocks: Stock[];
  selectedStock: Stock | null;
  onSelectStock: (stock: Stock) => void;
}

type SortField =
  | 'symbol'
  | 'price'
  | 'changePercent'
  | 'volume'
  | 'marketCap'
  | 'relativeStrength'
  | 'setupScore'
  | 'sma20'
  | 'sma50'
  | 'sma200';

type SortDirection = 'asc' | 'desc';
type StateFilter = 'All' | 'Actionable' | 'Close' | 'Watch';

const StockSidebar: React.FC<StockSidebarProps> = ({ stocks, selectedStock, onSelectStock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('setupScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [stateFilter, setStateFilter] = useState<StateFilter>('All');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);
  const lastSelectionSource = useRef<'keyboard' | 'click'>('click');

  const getDisplayChangePercent = (stock: Stock) => {
    if (Number.isFinite(stock.prevClose) && stock.prevClose > 0) {
      return ((stock.price - stock.prevClose) / stock.prevClose) * 100;
    }

    return Number.isFinite(stock.changePercent) ? stock.changePercent : 0;
  };

  useEffect(() => {
    if (lastSelectionSource.current === 'keyboard' && selectedRowRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const row = selectedRowRef.current;
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const isAboveView = rowRect.top < containerRect.top + 100;
      const isBelowView = rowRect.bottom > containerRect.bottom - 100;

      if (isAboveView || isBelowView) {
        row.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }

    lastSelectionSource.current = 'click';
  }, [selectedStock]);

  const filteredStocks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return stocks.filter((stock) => {
      const matchesSearch = !searchTerm
        || stock.symbol.toLowerCase().includes(term)
        || stock.name.toLowerCase().includes(term);
      const matchesState = stateFilter === 'All'
        || stock.setupProfile?.state === stateFilter
        || (stateFilter === 'Watch' && stock.setupProfile?.state === 'Uncovered');
      return matchesSearch && matchesState;
    });
  }, [stateFilter, stocks, searchTerm]);

  const sortedStocks = useMemo(() => {
    return [...filteredStocks].sort((a, b) => {
      let aValue: number | string = (a as any)[sortField];
      let bValue: number | string = (b as any)[sortField];

      if (sortField === 'changePercent') {
        aValue = getDisplayChangePercent(a);
        bValue = getDisplayChangePercent(b);
      }

      if (sortField === 'setupScore') {
        aValue = Number(a.setupProfile?.score) || 0;
        bValue = Number(b.setupProfile?.score) || 0;
      }

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        const left = String(aValue || '');
        const right = String(bValue || '');
        return sortDirection === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [filteredStocks, sortDirection, sortField]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (sortedStocks.length === 0) return;

      const currentIndex = selectedStock
        ? sortedStocks.findIndex((item) => item.symbol === selectedStock.symbol)
        : -1;

      let newIndex = -1;
      if (e.code === 'Space' || e.code === 'ArrowDown') {
        e.preventDefault();
        newIndex = currentIndex === -1 ? 0 : Math.min(sortedStocks.length - 1, currentIndex + 1);
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        newIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      }

      if (newIndex >= 0 && newIndex < sortedStocks.length) {
        lastSelectionSource.current = 'keyboard';
        onSelectStock(sortedStocks[newIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onSelectStock, selectedStock, sortedStocks]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('desc');
  };

  const getRSColor = (rs: number) => {
    if (rs >= 90) return 'text-green-400';
    if (rs >= 70) return 'text-blue-400';
    if (rs >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    if (!Number.isFinite(num)) return '-';
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDown size={14} className="opacity-30" />;
    }

    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-accent-blue" />
      : <ChevronDown size={14} className="text-accent-blue" />;
  };

  return (
    <section className="stock-universe-panel">
      <div className="universe-search">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-emerald-300" />
            <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-500">Universe explorer</span>
          </div>
          <span className="font-mono text-[9px] text-slate-600">↑↓ para navegar</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={15} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar símbolo o compañía…"
            aria-label="Buscar símbolo o compañía"
            className="w-full rounded-lg border border-white/[0.08] bg-[#080d13] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:border-emerald-400/40 focus:outline-none"
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px]">
          <span className="text-slate-500">
            {sortedStocks.length.toLocaleString('es-CO')} {sortedStocks.length === 1 ? 'acción' : 'acciones'}
          </span>
          {selectedStock && sortedStocks.length > 0 && (() => {
            const currentIndex = sortedStocks.findIndex((item) => item.symbol === selectedStock.symbol);
            if (currentIndex === -1) return null;
            return <span className="font-mono font-semibold text-emerald-300">#{currentIndex + 1} / {sortedStocks.length}</span>;
          })()}
        </div>
        <div className="universe-state-filters" aria-label="Filtrar por estado SEPA">
          {(['All', 'Actionable', 'Close', 'Watch'] as StateFilter[]).map((state) => (
            <button key={state} className={stateFilter === state ? 'active' : ''} onClick={() => setStateFilter(state)}>
              {state === 'All' ? 'Todos' : state}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        {sortedStocks.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No se encontraron acciones</div>
        ) : (
          <table className="min-w-[1040px] w-full text-[11px]">
            <thead className="sticky top-0 z-20 bg-[#101720]">
              <tr className="border-b border-white/[0.08]">
                <th
                  onClick={() => handleSort('symbol')}
                  className="sticky left-0 z-30 cursor-pointer whitespace-nowrap bg-[#101720] px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-[#18212c] hover:text-white"
                >
                  <div className="flex items-center gap-1">Símbolo <SortIcon field="symbol" /></div>
                </th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-400 whitespace-nowrap min-w-[170px]">Nombre</th>
                <th onClick={() => handleSort('price')} className="px-3 py-2.5 text-right font-semibold text-gray-300 cursor-pointer hover:bg-dark-300 hover:text-white whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">Precio <SortIcon field="price" /></div>
                </th>
                <th onClick={() => handleSort('changePercent')} className="px-3 py-2.5 text-right font-semibold text-gray-300 cursor-pointer hover:bg-dark-300 hover:text-white whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">Cambio % <SortIcon field="changePercent" /></div>
                </th>
                <th onClick={() => handleSort('volume')} className="px-3 py-2.5 text-right font-semibold text-gray-300 cursor-pointer hover:bg-dark-300 hover:text-white whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">Volumen <SortIcon field="volume" /></div>
                </th>
                <th onClick={() => handleSort('marketCap')} className="px-3 py-2.5 text-right font-semibold text-gray-300 cursor-pointer hover:bg-dark-300 hover:text-white whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">Market Cap <SortIcon field="marketCap" /></div>
                </th>
                <th onClick={() => handleSort('relativeStrength')} className="px-3 py-2.5 text-right font-semibold text-gray-300 cursor-pointer hover:bg-dark-300 hover:text-white whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">RS <SortIcon field="relativeStrength" /></div>
                </th>
                <th onClick={() => handleSort('setupScore')} className="px-3 py-2.5 text-left font-semibold text-gray-300 cursor-pointer hover:bg-dark-300 hover:text-white whitespace-nowrap min-w-[180px]">
                  <div className="flex items-center gap-1">Setup <SortIcon field="setupScore" /></div>
                </th>
                <th onClick={() => handleSort('sma20')} className="px-3 py-2.5 text-right font-semibold text-gray-300 cursor-pointer hover:bg-dark-300 hover:text-white whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">SMA 20 <SortIcon field="sma20" /></div>
                </th>
                <th onClick={() => handleSort('sma50')} className="px-3 py-2.5 text-right font-semibold text-gray-300 cursor-pointer hover:bg-dark-300 hover:text-white whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">SMA 50 <SortIcon field="sma50" /></div>
                </th>
                <th onClick={() => handleSort('sma200')} className="px-3 py-2.5 text-right font-semibold text-gray-300 cursor-pointer hover:bg-dark-300 hover:text-white whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">SMA 200 <SortIcon field="sma200" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStocks.map((stock) => {
                const isSelected = selectedStock?.symbol === stock.symbol;
                const changePercent = getDisplayChangePercent(stock);
                const isPositive = changePercent >= 0;
                const setup = stock.setupProfile;
                const setupRowClass = setup?.style?.rowClass || '';

                return (
                  <tr
                    key={stock.symbol}
                    ref={isSelected ? selectedRowRef : null}
                    onClick={() => onSelectStock(stock)}
                    tabIndex={0}
                    onKeyDown={(event) => event.key === 'Enter' && onSelectStock(stock)}
                    className={`group cursor-pointer border-b border-white/[0.045] outline-none transition-colors ${setupRowClass} ${isSelected ? 'bg-emerald-400/[0.08] ring-1 ring-inset ring-emerald-400/15' : 'hover:bg-white/[0.025] focus:bg-white/[0.035]'}`}
                  >
                    <td className={`sticky left-0 z-10 px-3 py-2.5 font-mono font-semibold text-white ${isSelected ? 'bg-[#10231f]' : 'bg-[#0c1118] group-hover:bg-[#10161e]'}`}>
                      {stock.symbol}
                    </td>
                    <td className="px-3 py-2 text-gray-300 truncate max-w-[170px]" title={stock.name}>{stock.name}</td>
                    <td className="px-3 py-2 text-right font-medium text-white">${stock.price.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300 text-xs">{stock.volume?.toLocaleString() || '-'}</td>
                    <td className="px-3 py-2 text-right text-gray-300 text-xs">{formatNumber(stock.marketCap)}</td>
                    <td className={`px-3 py-2 text-right font-bold ${getRSColor(stock.relativeStrength)}`}>{stock.relativeStrength}</td>
                    <td className="px-3 py-2 text-left">
                      {setup ? (
                        <div className="space-y-1 min-w-[165px]">
                          <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded border ${setup.style?.badgeClass || 'bg-gray-600/20 text-gray-300 border-gray-500/30'}`}>
                            {setup.state} · {setup.score}
                          </span>
                          <div className="truncate text-[9px] font-medium text-slate-500" title={setup.type}>{setup.type}</div>
                          {setup.tags && setup.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {setup.tags.slice(0, 2).map((tag) => (
                                <span key={`${stock.symbol}-${tag}`} className="text-[10px] px-1.5 py-0.5 rounded bg-dark-100 border border-gray-600 text-gray-300">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right text-xs ${stock.sma20 > 0 && stock.price > stock.sma20 ? 'text-green-400 font-medium' : 'text-gray-400'}`}>
                      {stock.sma20 > 0 ? `$${stock.sma20.toFixed(2)}` : '-'}
                    </td>
                    <td className={`px-3 py-2 text-right text-xs ${stock.sma50 > 0 && stock.price > stock.sma50 ? 'text-blue-400 font-medium' : 'text-gray-400'}`}>
                      {stock.sma50 > 0 ? `$${stock.sma50.toFixed(2)}` : '-'}
                    </td>
                    <td className={`px-3 py-2 text-right text-xs ${stock.sma200 > 0 && stock.price > stock.sma200 ? 'text-indigo-400 font-medium' : 'text-gray-400'}`}>
                      {stock.sma200 > 0 ? `$${stock.sma200.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

export default StockSidebar;
