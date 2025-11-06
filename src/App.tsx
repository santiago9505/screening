import { useState, useEffect, useCallback } from 'react';
import { Stock, Watchlist, StockFundamentals } from './types';
import { stockDataService } from './services/stockDataYahoo';
import axios from 'axios';
import StockSidebar from './components/StockSidebar';
import { WatchlistPanel } from './components/WatchlistPanel';
import { FundamentalsView } from './components/FundamentalsView';
import { StockFilters, FilterCriteria, applyFilters } from './components/StockFilters';
import TradingViewChart from './components/TradingViewChart';
import { BarChart3, RefreshCw, Loader, Filter, Check } from 'lucide-react';

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlist, setActiveWatchlist] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [fundamentals, setFundamentals] = useState<StockFundamentals | null>(null);
  const [showFundamentals, setShowFundamentals] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'default' | 'all' | 'indices'>('default');
  const [showInfoSidebar, setShowInfoSidebar] = useState(true);
  const [infoSidebarWidth, setInfoSidebarWidth] = useState(320);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterCriteria>({});
  const [screenedStocks, setScreenedStocks] = useState<Stock[]>([]);
  const [isCreatingWatchlistWithFilters, setIsCreatingWatchlistWithFilters] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalStocks, setTotalStocks] = useState(0);

  // Cargar watchlists del localStorage
  useEffect(() => {
    const savedWatchlists = localStorage.getItem('watchlists');
    if (savedWatchlists) {
      setWatchlists(JSON.parse(savedWatchlists));
    } else {
      // Crear una lista por defecto
      const defaultList: Watchlist = {
        id: 'default',
        name: 'Mis Favoritas',
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'NVDA'],
        createdAt: new Date(),
      };
      setWatchlists([defaultList]);
      localStorage.setItem('watchlists', JSON.stringify([defaultList]));
    }
  }, []);

  // Cargar datos de acciones con paginación - MEMOIZADO para evitar recreación
  const loadStocks = useCallback(async (forceFresh = false, mode: 'default' | 'all' | 'indices' = 'default', page = 1, append = false) => {
    console.log(`🔵 loadStocks llamado - forceFresh: ${forceFresh}, mode: ${mode}, page: ${page}, append: ${append}`);
    
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      // Si forceFresh, limpiar caché del backend primero
      if (forceFresh) {
        try {
          await axios.post('http://localhost:3002/api/cache/clear');
          console.log('🗑️ Caché del backend limpiado');
        } catch (error) {
          console.warn('No se pudo limpiar caché:', error);
        }
      }
      
      console.log(`🔄 Solicitando datos (modo: ${mode}, página: ${page})...`);
      const response = await stockDataService.getScreenerData(mode, page, 100);
      
      if (append && response.data.length > 0) {
        // Agregar a las acciones existentes (scroll infinito)
        // Filtrar duplicados por símbolo
        setStocks(prev => {
          const existingSymbols = new Set(prev.map(s => s.symbol));
          const newStocks = response.data.filter(s => !existingSymbols.has(s.symbol));
          return [...prev, ...newStocks];
        });
      } else {
        // Reemplazar todas las acciones
        setStocks(response.data);
      }
      
      // Actualizar info de paginación
      if (response.pagination) {
        setHasMore(response.pagination.hasMore);
        setTotalStocks(response.pagination.total);
        setCurrentPage(page);
        console.log(`✅ Página ${page}/${response.pagination.totalPages} | Total: ${response.pagination.total} acciones`);
      }
      
      setLastUpdate(new Date());
      console.log(`✅ ${response.data.length} acciones cargadas`);
    } catch (error) {
      console.error('Error loading stocks:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []); // Sin dependencias porque no usa ningún estado directamente

  // Función para cargar más acciones (scroll infinito)
  const loadMoreStocks = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadStocks(false, viewMode, currentPage + 1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, viewMode, currentPage]); // NO incluir loadStocks

  // Cargar cuando cambia el modo - ARREGLADO: Reset completo
  useEffect(() => {
    console.log(`🔄 Modo cambiado a: ${viewMode}`);
    setCurrentPage(1);
    setHasMore(false);
    setStocks([]); // Limpiar stocks anteriores
    loadStocks(false, viewMode, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]); // SOLO viewMode, no loadStocks

  // Auto-refresh cada 15 minutos - DESHABILITADO para evitar problemas
  // useEffect(() => {
  //   console.log('⏰ Configurando auto-refresh');
  //   const interval = setInterval(() => {
  //     console.log('🔄 Auto-refresh ejecutándose');
  //     loadStocks(false, viewMode, 1, false);
  //   }, 15 * 60 * 1000);
  //   return () => {
  //     console.log('🛑 Limpiando auto-refresh');
  //     clearInterval(interval);
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []); // NO depender de viewMode ni loadStocks para evitar reiniciar el intervalo

  // Guardar watchlists en localStorage cuando cambien
  useEffect(() => {
    if (watchlists.length > 0) {
      localStorage.setItem('watchlists', JSON.stringify(watchlists));
    }
  }, [watchlists]);

  const handleCreateWatchlist = (name: string) => {
    const newWatchlist: Watchlist = {
      id: Date.now().toString(),
      name,
      symbols: [],
      createdAt: new Date(),
    };
    setWatchlists([...watchlists, newWatchlist]);
  };

  const handleDeleteWatchlist = (id: string) => {
    setWatchlists(watchlists.filter((wl) => wl.id !== id));
    if (activeWatchlist === id) {
      setActiveWatchlist(null);
    }
  };

  const handleRenameWatchlist = (id: string, newName: string) => {
    setWatchlists(
      watchlists.map((wl) => (wl.id === id ? { ...wl, name: newName } : wl))
    );
  };

  const handleStockSelect = async (stock: Stock) => {
    setSelectedStock(stock);
    
    // Cargar datos fundamentales
    const fundamentalData = await stockDataService.getStockFundamentals(stock.symbol);
    if (fundamentalData) {
      setFundamentals(fundamentalData);
    }
  };

  const getFilteredStocks = (): Stock[] => {
    // Si hay resultados de screening, usar esos
    if (screenedStocks.length > 0) {
      return screenedStocks;
    }
    
    let filteredStocks = stocks;
    
    // Aplicar filtros de watchlist
    if (activeWatchlist) {
      const watchlist = watchlists.find((wl) => wl.id === activeWatchlist);
      if (watchlist) {
        filteredStocks = filteredStocks.filter((stock) => watchlist.symbols.includes(stock.symbol));
      }
    }
    
    // Aplicar filtros locales (solo si no hay screening de backend)
    if (Object.keys(activeFilters).length > 0 && screenedStocks.length === 0) {
      filteredStocks = applyFilters(filteredStocks, activeFilters);
    }
    
    return filteredStocks;
  };

  const handleApplyFilters = (criteria: FilterCriteria, results?: Stock[]) => {
    setActiveFilters(criteria);
    
    // Si hay resultados del screening del backend, usarlos
    if (results) {
      setScreenedStocks(results);
      
      // Si estamos creando una watchlist con filtros
      if (isCreatingWatchlistWithFilters) {
        // Pedir nombre de la lista
        const symbols = results.map(s => s.symbol);
        if (symbols.length === 0) {
          alert('No se encontraron acciones que cumplan los criterios');
          setIsCreatingWatchlistWithFilters(false);
          return;
        }
        
        // Mostrar modal para nombre de lista
        setShowFilters(false);
        // El modal de nombre se muestra en el render
      }
      // NO actualizar stocks aquí - usar screenedStocks en getFilteredStocks()
    } else {
      setScreenedStocks([]); // Limpiar resultados de screening
    }
  };

  const handleCreateWatchlistWithFilters = () => {
    setIsCreatingWatchlistWithFilters(true);
    setShowFilters(true);
  };

  const handleSaveWatchlistWithResults = () => {
    if (!newWatchlistName.trim()) {
      alert('Por favor ingresa un nombre para la lista');
      return;
    }
    
    const symbols = screenedStocks.map(s => s.symbol);
    const newWatchlist: Watchlist = {
      id: Date.now().toString(),
      name: newWatchlistName.trim(),
      symbols: symbols,
      createdAt: new Date(),
    };
    
    setWatchlists([...watchlists, newWatchlist]);
    setActiveWatchlist(newWatchlist.id);
    setIsCreatingWatchlistWithFilters(false);
    setNewWatchlistName('');
    setStocks(screenedStocks); // Mostrar las acciones de la nueva lista
  };

  return (
    <div className="h-screen flex flex-col bg-dark-300">
      {/* Header con Watchlists */}
      <header className="bg-dark-200 border-b border-gray-700 px-6 py-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-accent-blue" size={28} />
            <div>
              <h1 className="text-xl font-bold text-white">Stock Screener Pro</h1>
              <p className="text-xs text-gray-400">
                {lastUpdate && `Última actualización: ${lastUpdate.toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botón de Filtros */}
            <button
              onClick={() => setShowFilters(true)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                Object.keys(activeFilters).length > 0
                  ? 'bg-accent-blue text-white'
                  : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
              }`}
              title="Filtros avanzados"
            >
              <Filter size={16} />
              Filtros
              {Object.keys(activeFilters).length > 0 && (
                <span className="bg-white text-accent-blue rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {Object.keys(activeFilters).length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => loadStocks(true, viewMode)}
              disabled={loading}
              className="bg-accent-blue hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Forzar actualización (limpia caché)"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Cargando...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Actualizar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Watchlists Horizontal con modos integrados */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {/* Botones de Modo */}
          <button
            onClick={() => setViewMode('default')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              viewMode === 'default'
                ? 'bg-accent-blue text-white'
                : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
            }`}
          >
            📊 Top 25
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              viewMode === 'all'
                ? 'bg-accent-blue text-white'
                : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
            }`}
          >
            🌐 Todas {viewMode === 'all' && stocks.length > 0 ? `(${stocks.length})` : ''}
          </button>
          <button
            onClick={() => setViewMode('indices')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              viewMode === 'indices'
                ? 'bg-accent-blue text-white'
                : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
            }`}
          >
            📈 Índices
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-600 mx-2"></div>

          {/* Watchlists Panel integrado */}
          <WatchlistPanel
            watchlists={watchlists}
            activeWatchlist={activeWatchlist}
            onSelectWatchlist={setActiveWatchlist}
            onCreateWatchlist={handleCreateWatchlist}
            onDeleteWatchlist={handleDeleteWatchlist}
            onRenameWatchlist={handleRenameWatchlist}
            onCreateWithFilters={handleCreateWatchlistWithFilters}
          />
        </div>
      </header>

      {/* Main Content - 2 columnas: Lista | Gráfico + Sidebar Info */}
      <div className="flex-1 flex overflow-hidden">
        {/* Columna 1: Lista de acciones (izquierda) */}
        {loading && stocks.length === 0 ? (
          <div className="w-80 bg-dark-200 border-r border-gray-700 flex items-center justify-center">
            <div className="text-center p-4">
              <Loader className="animate-spin text-accent-blue mx-auto mb-3" size={40} />
              <p className="text-sm text-gray-400">Cargando...</p>
            </div>
          </div>
        ) : (
          <StockSidebar
            stocks={getFilteredStocks()}
            selectedStock={selectedStock}
            onSelectStock={handleStockSelect}
            onLoadMore={loadMoreStocks}
            hasMore={hasMore}
            loadingMore={loadingMore}
            totalStocks={totalStocks}
          />
        )}
        
        {/* Columna 2: Gráfico + Sidebar Info Derecho */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Gráfico */}
          <div className="flex-1 bg-dark-300 overflow-hidden relative">
            {selectedStock ? (
              <>
                {/* Botón para mostrar sidebar (cuando está oculto) */}
                {!showInfoSidebar && (
                  <button
                    onClick={() => setShowInfoSidebar(true)}
                    className="absolute top-4 right-4 z-20 bg-dark-200 hover:bg-dark-100 text-white p-2 rounded-lg border border-gray-700 transition-colors shadow-lg"
                    title="Mostrar información"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <TradingViewChart symbol={selectedStock.symbol} theme="dark" />
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <BarChart3 size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecciona una acción del panel izquierdo</p>
                  <p className="text-sm mt-2">para ver el gráfico profesional</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar de Información (derecha, colapsable) */}
          {selectedStock && showInfoSidebar && (
            <div 
              className="bg-dark-200 border-l border-gray-700 flex flex-col overflow-y-auto transition-all duration-300 relative"
              style={{ width: `${infoSidebarWidth}px`, minWidth: '250px', maxWidth: '500px' }}
            >
              {/* Resize handle con botón de cerrar integrado */}
              <div className="absolute left-0 top-0 bottom-0 w-6 flex items-start justify-center pt-4 z-10">
                {/* Botón de cerrar en el borde izquierdo */}
                <button
                  onClick={() => setShowInfoSidebar(false)}
                  className="bg-dark-200 hover:bg-dark-100 text-white p-1.5 rounded-lg border border-gray-700 transition-colors shadow-lg"
                  title="Ocultar información"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {/* Resize handle (zona arrastrable) */}
              <div
                className="absolute left-0 top-12 bottom-0 w-1 cursor-col-resize hover:bg-accent-blue transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const startX = e.clientX;
                  const startWidth = infoSidebarWidth;
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    const diff = startX - e.clientX;
                    const newWidth = Math.min(Math.max(startWidth + diff, 250), 500);
                    setInfoSidebarWidth(newWidth);
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
              
              <div className="p-4 pl-10">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-white">{selectedStock.symbol}</h2>
                  <p className="text-sm text-gray-400 mt-1">{selectedStock.name}</p>
                </div>
                
                {/* Tabla de información */}
                <div className="space-y-3">
                  <div className="bg-dark-300 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Precio</p>
                    <p className="text-2xl font-bold text-white">${selectedStock.price.toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-dark-300 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Cambio</p>
                    <p className={`text-xl font-bold ${selectedStock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                    </p>
                  </div>
                  
                  <div className="bg-dark-300 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Relative Strength</p>
                    <p className="text-xl font-bold text-accent-blue">{selectedStock.relativeStrength.toFixed(0)}</p>
                  </div>
                  
                  <div className="bg-dark-300 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Volumen</p>
                    <p className="text-lg font-semibold text-white">{(selectedStock.volume / 1000000).toFixed(1)}M</p>
                  </div>
                </div>
                
                {/* Medias Móviles */}
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-3">Medias Móviles</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">SMA 20</span>
                      <span className={`text-sm font-semibold ${selectedStock.price > selectedStock.sma20 ? 'text-green-400' : 'text-red-400'}`}>
                        ${selectedStock.sma20.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">SMA 50</span>
                      <span className={`text-sm font-semibold ${selectedStock.price > selectedStock.sma50 ? 'text-green-400' : 'text-red-400'}`}>
                        ${selectedStock.sma50.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">SMA 200</span>
                      <span className={`text-sm font-semibold ${selectedStock.price > selectedStock.sma200 ? 'text-green-400' : 'text-red-400'}`}>
                        ${selectedStock.sma200.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">EMA 20</span>
                      <span className="text-sm font-semibold text-white">${selectedStock.ema20.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">EMA 50</span>
                      <span className="text-sm font-semibold text-white">${selectedStock.ema50.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {fundamentals && (
                  <button
                    onClick={() => setShowFundamentals(true)}
                    className="w-full mt-4 bg-accent-blue hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Ver Fundamentales
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fundamentals Modal */}
      {showFundamentals && selectedStock && fundamentals && (
        <FundamentalsView
          symbol={selectedStock.symbol}
          quarterlyData={fundamentals.quarterlyData}
          onClose={() => {
            setShowFundamentals(false);
            setSelectedStock(null);
            setFundamentals(null);
          }}
        />
      )}

      {/* Filters Modal */}
      {showFilters && (
        <StockFilters
          onApplyFilters={handleApplyFilters}
          onClose={() => {
            setShowFilters(false);
            if (isCreatingWatchlistWithFilters) {
              setIsCreatingWatchlistWithFilters(false);
            }
          }}
        />
      )}

      {/* Modal para guardar watchlist con resultados de filtros */}
      {isCreatingWatchlistWithFilters && screenedStocks.length > 0 && !showFilters && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-dark-200 rounded-lg shadow-2xl p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Guardar Watchlist</h3>
            <p className="text-sm text-gray-400 mb-4">
              Se encontraron <strong className="text-accent-blue">{screenedStocks.length} acciones</strong> que cumplen tus criterios.
            </p>
            <input
              type="text"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSaveWatchlistWithResults()}
              placeholder="Nombre de la lista..."
              className="w-full bg-dark-100 text-white px-4 py-2 rounded border border-gray-600 focus:border-accent-blue focus:outline-none mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsCreatingWatchlistWithFilters(false);
                  setNewWatchlistName('');
                  setScreenedStocks([]);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWatchlistWithResults}
                className="px-4 py-2 bg-accent-blue hover:bg-blue-600 text-white rounded transition-colors flex items-center gap-2"
              >
                <Check size={16} />
                Crear Lista
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-green-500/10 border-t border-green-500/20 px-6 py-2 text-center">
        <p className="text-green-400 text-sm">
          ✅ <strong>PRODUCCIÓN:</strong> Datos reales de Yahoo Finance + Gráficos profesionales TradingView.
          {stocks.length > 0 && ` ${stocks.length} acciones en tiempo real.`} 
          {Object.keys(activeFilters).length > 0 && ` Filtros activos: ${Object.keys(activeFilters).length}`}
          {getFilteredStocks().length !== stocks.length && ` (Mostrando ${getFilteredStocks().length} de ${stocks.length})`}
          Todo gratis y completamente funcional! 🚀📈
        </p>
      </div>
    </div>
  );
}

export default App;
