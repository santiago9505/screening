import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Stock, Watchlist, StockFundamentals } from './types';
import { stockDataService } from './services/stockDataYahoo';
import StockSidebar from './components/StockSidebar';
import { WatchlistPanel } from './components/WatchlistPanel';
import { FundamentalsView } from './components/FundamentalsView';
import FundamentalsStrip from './components/FundamentalsStrip';
import { StockFilters, FilterCriteria } from './components/StockFilters';
import TradingViewChart from './components/TradingViewChart';
import SetupPanel from './components/SetupPanel';
import SetupLabModal from './components/SetupLabModal';
import EmailPanel from './components/EmailPanel';
import ProfessionalWorkspace from './components/ProfessionalWorkspace';
import { shouldPreferDirectMarketData } from './config/runtime';
import { enrichMinerviniUniverse, evaluateMinerviniStock } from './services/minerviniIntelligence';
// Asistente Fresa AI desactivado temporalmente. Descomentar para reactivarlo.
// import FresaAIPet, { FresaPetState } from './components/FresaAIPet';
import {
  BarChart3,
  Filter,
  Loader,
  Mail,
  RefreshCw,
} from 'lucide-react';

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlist, setActiveWatchlist] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [fundamentals, setFundamentals] = useState<StockFundamentals | null>(null);
  const [fundamentalsLoading, setFundamentalsLoading] = useState(false);
  const [fundamentalsError, setFundamentalsError] = useState<string | null>(null);
  const [showFundamentals, setShowFundamentals] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'default' | 'all' | 'indices'>('all');
  const [showInfoSidebar, setShowInfoSidebar] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterCriteria>({});
  const [screenedStocks, setScreenedStocks] = useState<Stock[]>([]);
  const [isCreatingWatchlistWithFilters, setIsCreatingWatchlistWithFilters] = useState(false);
  const [allStocksCache, setAllStocksCache] = useState<Stock[]>([]); // Cache de TODAS las acciones
  const [pendingSelectedSymbol, setPendingSelectedSymbol] = useState<string | null>(null);
  const [watchlistsReady, setWatchlistsReady] = useState(false);
  const [presetSyncing, setPresetSyncing] = useState(false);
  const [showSetupLab, setShowSetupLab] = useState(false);
  const [activeSection, setActiveSection] = useState<'screener' | 'email'>('screener');
  const [dataProvider, setDataProvider] = useState<'local-engine' | 'direct-market' | 'cache'>('local-engine');
  const [loadError, setLoadError] = useState<string | null>(null);
  const fundamentalsRequestRef = useRef(0);
  const watchlistsRef = useRef<Watchlist[]>([]);
  // Asistente Fresa AI desactivado temporalmente. Descomentar junto con el import y el JSX para reactivarlo.
  // const fresaPetState: FresaPetState = loading || fundamentalsLoading || presetSyncing
  //   ? 'running'
  //   : fundamentalsError
  //     ? 'failed'
  //     : showFilters || showSetupLab
  //       ? 'waiting'
  //       : selectedStock
  //         ? 'review'
  //         : 'idle';

  // Memoizar stocks filtrados para uso consistente
  const filteredStocks = useMemo(() => {
    // PRIORIDAD 1: Si hay resultados de screening del backend, usar esos
    if (screenedStocks.length > 0) {
      return screenedStocks;
    }
    
    // PRIORIDAD 2: Si hay una watchlist activa, filtrar por ella
    if (activeWatchlist) {
      const watchlist = watchlists.find((wl) => wl.id === activeWatchlist);
      if (watchlist) {
        return stocks.filter((stock) => watchlist.symbols.includes(stock.symbol));
      }
    }
    
    // PRIORIDAD 3: Mostrar todos los stocks del modo actual (default/all/indices)
    return stocks;
  }, [screenedStocks, activeWatchlist, watchlists, stocks]);

  const marketPulseSource = useMemo(() => {
    if (viewMode === 'all' && !activeWatchlist && allStocksCache.length > stocks.length) return allStocksCache;
    return stocks;
  }, [activeWatchlist, allStocksCache, stocks, viewMode]);

  const marketPulse = useMemo(() => {
    const valid = marketPulseSource.filter((stock) => Number.isFinite(stock.price) && stock.price > 0);
    const total = valid.length;
    const advancers = valid.filter((stock) => stock.changePercent > 0).length;
    const aboveSma50 = valid.filter((stock) => stock.sma50 > 0 && stock.price > stock.sma50).length;
    const leaders = valid.filter((stock) => stock.relativeStrength >= 80).length;
    const averageChange = total > 0
      ? valid.reduce((sum, stock) => sum + (Number(stock.changePercent) || 0), 0) / total
      : 0;
    const breadth = total > 0 ? Math.round((advancers / total) * 100) : 0;
    const trendQuality = total > 0 ? Math.round((aboveSma50 / total) * 100) : 0;

    return { total, advancers, breadth, trendQuality, leaders, averageChange };
  }, [marketPulseSource]);

  const intelligenceUniverse = useMemo(() => enrichMinerviniUniverse(marketPulseSource), [marketPulseSource]);
  const intelligenceStocks = useMemo(() => enrichMinerviniUniverse(filteredStocks), [filteredStocks]);
  const intelligenceSelectedStock = useMemo(() => {
    if (!selectedStock) return null;
    return intelligenceStocks.find((stock) => stock.symbol === selectedStock.symbol)
      || { ...selectedStock, setupProfile: evaluateMinerviniStock(selectedStock) };
  }, [intelligenceStocks, selectedStock]);

  useEffect(() => {
    watchlistsRef.current = watchlists;
  }, [watchlists]);

  const areWatchlistsEqual = useCallback((left: Watchlist[], right: Watchlist[]) => {
    return JSON.stringify(left) === JSON.stringify(right);
  }, []);

  const applyWatchlistRefresh = useCallback((currentWatchlists: Watchlist[], refreshedWatchlists: Watchlist[]): Watchlist[] => {
    const refreshedById = new Map(refreshedWatchlists.map((watchlist) => [watchlist.id, watchlist]));
    let changed = false;

    const merged = currentWatchlists.map((currentWatchlist) => {
      const refreshedWatchlist = refreshedById.get(currentWatchlist.id);
      if (!refreshedWatchlist) {
        return currentWatchlist;
      }

      const nextWatchlist = currentWatchlist.isBuiltIn || currentWatchlist.presetId
        ? refreshedWatchlist
        : {
            ...refreshedWatchlist,
            name: currentWatchlist.name,
          };

      if (!changed && JSON.stringify(nextWatchlist) !== JSON.stringify(currentWatchlist)) {
        changed = true;
      }

      return nextWatchlist;
    });

    return changed ? merged : currentWatchlists;
  }, []);

  const mergePresetWatchlists = useCallback((sourceWatchlists: Watchlist[], presetLists: Awaited<ReturnType<typeof stockDataService.getMinerviniPresetLists>>['presets']): Watchlist[] => {
    const existingByPreset = new Map(
      sourceWatchlists
        .filter((watchlist) => watchlist.presetId)
        .map((watchlist) => [watchlist.presetId as string, watchlist])
    );

    const merged = [...sourceWatchlists];

    presetLists.forEach((preset) => {
      const existing = existingByPreset.get(preset.id);
      if (existing) {
        const index = merged.findIndex((wl) => wl.id === existing.id);
        if (index >= 0) {
          merged[index] = {
            ...merged[index],
            name: preset.name,
            symbols: preset.symbols || [],
            presetDescription: preset.description,
            lastSyncedAt: new Date().toISOString(),
          };
        }
        return;
      }

      merged.push({
        id: `preset:${preset.id}`,
        name: preset.name,
        symbols: preset.symbols || [],
        createdAt: new Date(),
        isDynamic: true,
        presetId: preset.id,
        presetDescription: preset.description,
        isBuiltIn: true,
        lastSyncedAt: new Date().toISOString(),
      });
    });

    return merged;
  }, []);

  // Cargar estado local inicial
  useEffect(() => {
    try {
      const savedWatchlists = localStorage.getItem('watchlists');
      if (savedWatchlists) {
        const parsed = JSON.parse(savedWatchlists);
        if (Array.isArray(parsed)) {
          const hydratedWatchlists: Watchlist[] = parsed.map((wl) => ({
            ...wl,
            symbols: Array.isArray(wl.symbols) ? wl.symbols : [],
            createdAt: wl.createdAt ? new Date(wl.createdAt) : new Date(),
          }));
          setWatchlists(hydratedWatchlists);
        }
      } else {
        const defaultList: Watchlist = {
          id: 'default',
          name: 'Mis Favoritas',
          symbols: ['AAPL', 'MSFT', 'GOOGL', 'NVDA'],
          createdAt: new Date(),
        };
        setWatchlists([defaultList]);
        localStorage.setItem('watchlists', JSON.stringify([defaultList]));
      }

      const last = localStorage.getItem('lastSelectedStock');
      if (last) {
        setPendingSelectedSymbol(last);
      }

      const savedFilters = localStorage.getItem('activeFilters');
      if (savedFilters) {
        setActiveFilters(JSON.parse(savedFilters));
      }
    } catch (error) {
      console.error('Error restaurando estado local:', error);
    } finally {
      setWatchlistsReady(true);
    }
  }, []);

  // Restaurar seleccion una vez que el universo de acciones esta listo
  useEffect(() => {
    if (!pendingSelectedSymbol || stocks.length === 0) return;

    const found = stocks.find((s) => s.symbol === pendingSelectedSymbol);
    if (found) {
      setSelectedStock(found);
      setPendingSelectedSymbol(null);
    }
  }, [pendingSelectedSymbol, stocks]);

  useEffect(() => {
    if (!watchlistsReady) return;

    let cancelled = false;
    const loadPresetWatchlists = async () => {
      try {
        setPresetSyncing(true);
        const presetResponse = await stockDataService.getMinerviniPresetLists(false);
        if (cancelled) return;

        setWatchlists((currentWatchlists) => {
          const merged = mergePresetWatchlists(currentWatchlists, presetResponse.presets);
          return areWatchlistsEqual(currentWatchlists, merged) ? currentWatchlists : merged;
        });
      } catch (error) {
        console.error('Error cargando presets Minervini:', error);
      } finally {
        if (!cancelled) {
          setPresetSyncing(false);
        }
      }
    };

    loadPresetWatchlists();

    return () => {
      cancelled = true;
    };
  }, [areWatchlistsEqual, mergePresetWatchlists, watchlistsReady]); // Solo al iniciar despues de restaurar
  // Cargar datos de acciones
  const loadStocks = useCallback(async (forceFresh = false, mode: 'default' | 'all' | 'indices' = 'all') => {
    console.log(`[stocks] loadStocks llamado - forceFresh: ${forceFresh}, mode: ${mode}`);
    
    setLoading(true);
    setLoadError(null);
    const previousAllStocksCache = allStocksCache;
    
    try {
      // Si forceFresh, limpiar cache del backend
      if (forceFresh) {
        try {
          await stockDataService.clearCache();
          console.log('[cache] Cache del backend limpiado');
          setAllStocksCache([]); // Limpiar tambien cache local
        } catch (error) {
          console.warn('No se pudo limpiar cache:', error);
        }
      }
      
      console.log(`[stocks] Solicitando datos (modo: ${mode})...`);
      const response = await stockDataService.getScreenerData(mode);
      setDataProvider(response.provider || 'local-engine');
      
      // Si es modo "all", guardar en cache local
      if (mode === 'all') {
        setAllStocksCache(response.data);
        console.log(`[cache] Cache actualizado con ${response.data.length} acciones`);
      }
      
      setStocks(response.data);
      
      setLastUpdate(new Date());
      console.log(`[stocks] ${response.data.length} acciones cargadas`);
    } catch (error) {
      if (previousAllStocksCache.length > 0) {
        setAllStocksCache(previousAllStocksCache);
      }
      console.error('Error loading stocks:', error);
      setLoadError('No pudimos actualizar el mercado. Conservamos el último universo disponible.');
    } finally {
      setLoading(false);
    }
  }, [allStocksCache]);

  // Cargar acciones al iniciar
  useEffect(() => {
    // Cargar modo inicial
    loadStocks(false, viewMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  const refreshDynamicWatchlists = useCallback(async (sourceWatchlists: Watchlist[], force = false): Promise<Watchlist[]> => {
    const today = new Date().toISOString().slice(0, 10);
    const dynamicLists = sourceWatchlists.filter((wl) => {
      if (!wl.isDynamic || !wl.filters) return false;
      if (force) return true;
      if (!wl.lastSyncedAt) return true;
      return wl.lastSyncedAt.slice(0, 10) !== today;
    });
    const presetLists = sourceWatchlists.filter((wl) => {
      if (!wl.isDynamic || !wl.presetId) return false;
      if (force) return true;
      if (!wl.lastSyncedAt) return true;
      return wl.lastSyncedAt.slice(0, 10) !== today;
    });

    if (dynamicLists.length === 0 && presetLists.length === 0) {
      return sourceWatchlists;
    }

    console.log(`[Watchlists] Actualizando ${dynamicLists.length} listas dinamicas y ${presetLists.length} listas Minervini...`);
    const updatedWatchlists = [...sourceWatchlists];

    if (presetLists.length > 0) {
      try {
        const presetResponse = await stockDataService.getMinerviniPresetLists(force);
        const presetMap = new Map(presetResponse.presets.map((preset) => [preset.id, preset]));

        presetLists.forEach((list) => {
          const preset = presetMap.get(list.presetId || '');
          if (!preset) return;

          const index = updatedWatchlists.findIndex((wl) => wl.id === list.id);
          if (index >= 0) {
            updatedWatchlists[index] = {
              ...updatedWatchlists[index],
              name: preset.name,
              symbols: preset.symbols,
              presetDescription: preset.description,
              lastSyncedAt: new Date().toISOString(),
            };
          }
        });
      } catch (error) {
        console.error('Error actualizando listas Minervini:', error);
      }
    }

    for (const list of dynamicLists) {
      try {
        const response = await stockDataService.screenStocks(list.filters);
        const updatedSymbols = response.map((stock) => stock.symbol);
        const index = updatedWatchlists.findIndex((wl) => wl.id === list.id);

        if (index >= 0) {
          updatedWatchlists[index] = {
            ...updatedWatchlists[index],
            symbols: updatedSymbols,
            lastSyncedAt: new Date().toISOString(),
          };
        }

        console.log(`[Watchlists] "${list.name}" actualizada: ${updatedSymbols.length} simbolos`);
      } catch (error) {
        console.error(`Error actualizando watchlist "${list.name}":`, error);
      }
    }

    return updatedWatchlists;
  }, []);

  useEffect(() => {
    if (watchlists.length === 0) return;

    let cancelled = false;
    const syncDynamicWatchlists = async () => {
      const updated = await refreshDynamicWatchlists(watchlists);
      if (cancelled) return;

      setWatchlists((currentWatchlists) => applyWatchlistRefresh(currentWatchlists, updated));
    };

    syncDynamicWatchlists();

    return () => {
      cancelled = true;
    };
  }, [applyWatchlistRefresh, refreshDynamicWatchlists, watchlists]);

  useEffect(() => {
    if (!activeWatchlist) return;

    const activeList = watchlists.find((wl) => wl.id === activeWatchlist);
    if (!activeList) return;

    let cancelled = false;
    const loadActiveWatchlistStocks = async () => {
      setLoading(true);
      try {
        if (activeList.symbols.length === 0) {
          if (!cancelled) {
            setStocks([]);
            setSelectedStock(null);
            setFundamentals(null);
          }
          return;
        }

        const response = await stockDataService.getStocksBySymbols(activeList.symbols);
        if (!cancelled) {
          setStocks(response.data);
          setLastUpdate(new Date());
          setSelectedStock((current) => {
            if (!current) return response.data[0] || null;
            return response.data.some((stock) => stock.symbol === current.symbol)
              ? current
              : (response.data[0] || null);
          });
        }
      } catch (error) {
        console.error('Error cargando simbolos de watchlist:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadActiveWatchlistStocks();

    return () => {
      cancelled = true;
    };
  }, [activeWatchlist, watchlists]);
  // Cambiar entre modos (solo despues de la carga inicial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    // Saltar primera ejecucion (ya se carga en el efecto anterior)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (viewMode === 'all' && allStocksCache.length > 0) {
      // Si ya tenemos el cache completo, usarlo
      console.log('[modo] Todas: usando cache');
      setStocks(allStocksCache);
    } else {
      // Para default e indices, cargar del servidor
      console.log(`[modo] Modo cambiado a: ${viewMode}, cargando del servidor`);
      loadStocks(false, viewMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Auto-refresh cada 15 minutos - DESHABILITADO para evitar problemas
  // useEffect(() => {
  //   console.log('Configurando auto-refresh');
  //   const interval = setInterval(() => {
  //     console.log('Auto-refresh ejecutandose');
  //     loadStocks(false, viewMode, 1, false);
  //   }, 15 * 60 * 1000);
  //   return () => {
  //     console.log('Limpiando auto-refresh');
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

  useEffect(() => {
    try {
      if (Object.keys(activeFilters).length > 0) {
        localStorage.setItem('activeFilters', JSON.stringify(activeFilters));
      } else {
        localStorage.removeItem('activeFilters');
      }
    } catch {}
  }, [activeFilters]);

  const handleCreateWatchlist = (name: string) => {
    const newWatchlist: Watchlist = {
      id: Date.now().toString(),
      name,
      symbols: [],
      createdAt: new Date(),
    };
    setWatchlists((currentWatchlists) => [...currentWatchlists, newWatchlist]);
  };

  const handleDeleteWatchlist = (id: string) => {
    setWatchlists((currentWatchlists) => currentWatchlists.filter((wl) => wl.id !== id));
    if (activeWatchlist === id) {
      setActiveWatchlist(null);
    }
  };

  const handleRenameWatchlist = (id: string, newName: string) => {
    setWatchlists((currentWatchlists) =>
      currentWatchlists.map((wl) => (wl.id === id ? { ...wl, name: newName } : wl))
    );
  };

  const loadFundamentalsForStock = useCallback(async (stock: Stock | null) => {
    const requestId = ++fundamentalsRequestRef.current;
    setFundamentals(null);
    setFundamentalsError(null);

    if (!stock) {
      setFundamentalsLoading(false);
      return;
    }

    setFundamentalsLoading(true);
    try {
      const fundamentalData = await stockDataService.getStockFundamentals(stock.symbol);
      if (requestId !== fundamentalsRequestRef.current) {
        return;
      }

      if (!fundamentalData || !fundamentalData.quarterlyData || fundamentalData.quarterlyData.length === 0) {
        setFundamentalsError(shouldPreferDirectMarketData
          ? 'Métricas TTM activas. El histórico trimestral se habilita al conectar el motor privado.'
          : 'No hay datos fundamentales trimestrales para este símbolo.');
        setFundamentals(null);
        return;
      }

      setFundamentals(fundamentalData);
    } catch (error) {
      if (requestId === fundamentalsRequestRef.current) {
        setFundamentalsError('No se pudieron cargar los fundamentales.');
        setFundamentals(null);
      }
    } finally {
      if (requestId === fundamentalsRequestRef.current) {
        setFundamentalsLoading(false);
      }
    }
  }, []);

  const handleStockSelect = async (stock: Stock) => {
    setSelectedStock(stock);
    try {
      localStorage.setItem('lastSelectedStock', stock.symbol);
    } catch {}
  };

  const refreshSelectedStockSetup = useCallback(async () => {
    if (!selectedStock) return;

    try {
      const response = await stockDataService.getStocksBySymbols([selectedStock.symbol]);
      const updated = response.data && response.data.length > 0 ? response.data[0] : null;
      if (!updated) return;

      setSelectedStock(updated);
      setStocks((prev) => prev.map((item) => (item.symbol === updated.symbol ? updated : item)));
    } catch (error) {
      console.error('Error refrescando setup del simbolo seleccionado:', error);
    }
  }, [selectedStock]);

  useEffect(() => {
    loadFundamentalsForStock(selectedStock);
  }, [loadFundamentalsForStock, selectedStock]);

  const getFilteredStocks = (): Stock[] => {
    return filteredStocks; // Usar el valor memoizado
  };

  const canDisplayFundamentals = useMemo(() => Boolean(selectedStock), [selectedStock]);
  const firstMinerviniWatchlistId = useMemo(
    () => watchlists.find((watchlist) => watchlist.presetId)?.id || null,
    [watchlists]
  );

  const handleOpenMinerviniLists = useCallback(async () => {
    const sourceWatchlists = watchlistsRef.current;
    const updatedWatchlists = await refreshDynamicWatchlists(sourceWatchlists, true);
    const mergedWatchlists = applyWatchlistRefresh(watchlistsRef.current, updatedWatchlists);

    if (!areWatchlistsEqual(watchlistsRef.current, mergedWatchlists)) {
      setWatchlists(mergedWatchlists);
    }

    const targetId = mergedWatchlists.find((watchlist) => watchlist.presetId)?.id || firstMinerviniWatchlistId;
    if (targetId) {
      setViewMode('all');
      setScreenedStocks([]);
      setActiveFilters({});
      setActiveWatchlist(targetId);
    }
  }, [applyWatchlistRefresh, areWatchlistsEqual, firstMinerviniWatchlistId, refreshDynamicWatchlists]);

  const handleRefresh = useCallback(async () => {
    // Limpiar cache del backend siempre al refrescar manualmente
    try {
      await stockDataService.clearCache();
      console.log('[refresh] Cache del backend limpiado');
    } catch (error) {
      console.warn('[refresh] No se pudo limpiar cache:', error);
    }

    if (!activeWatchlist) {
      await loadStocks(true, viewMode);
    }

    const sourceWatchlists = watchlistsRef.current;
    const refreshedWatchlists = await refreshDynamicWatchlists(sourceWatchlists, true);
    const mergedWatchlists = applyWatchlistRefresh(watchlistsRef.current, refreshedWatchlists);

    if (!areWatchlistsEqual(watchlistsRef.current, mergedWatchlists)) {
      setWatchlists(mergedWatchlists);
    }

    if (activeWatchlist) {
      const activeList = mergedWatchlists.find((wl) => wl.id === activeWatchlist);
      if (!activeList) return;

      setLoading(true);
      try {
        if (activeList.symbols.length === 0) {
          setStocks([]);
          setSelectedStock(null);
          setFundamentals(null);
          return;
        }

        const response = await stockDataService.getStocksBySymbols(activeList.symbols);
        setStocks(response.data);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error actualizando watchlist activa:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [activeWatchlist, applyWatchlistRefresh, areWatchlistsEqual, loadStocks, refreshDynamicWatchlists, viewMode]);

  const handleApplyFilters = (criteria: FilterCriteria, results?: Stock[], watchlistName?: string) => {
    setActiveFilters(criteria);
    
    // Si hay resultados del screening del backend, usarlos
    if (results) {
      // Si estamos creando una watchlist con filtros Y tenemos nombre
      if (isCreatingWatchlistWithFilters && watchlistName) {
        const symbols = results.map(s => s.symbol);
        
        if (symbols.length === 0) {
          alert('No se encontraron acciones que cumplan los criterios');
          setIsCreatingWatchlistWithFilters(false);
          return;
        }
        
        // Crear la watchlist directamente con filtros guardados
        const newWatchlist: Watchlist = {
          id: Date.now().toString(),
          name: watchlistName,
          symbols: symbols,
          createdAt: new Date(),
          filters: criteria, // Guardar filtros para re-ejecutar
          isDynamic: true, // Marcar como dinamica
          lastSyncedAt: new Date().toISOString(),
        };
        
        setWatchlists((currentWatchlists) => [...currentWatchlists, newWatchlist]);
        
        setActiveWatchlist(newWatchlist.id);
        setIsCreatingWatchlistWithFilters(false);
        setScreenedStocks([]);
        setStocks(results); // Mostrar las acciones de la nueva lista
        
        console.log(`[watchlist] "${watchlistName}" creada con ${symbols.length} acciones (Dinamica)`);
      }
      // Si NO estamos creando watchlist, cambiar a modo "all" para mostrar resultados
      else {
        setScreenedStocks(results);
        setViewMode('all');
        setStocks(results); // Reemplazar stocks con resultados del filtro
        setActiveWatchlist(null); // Limpiar watchlist activa
      }
    } else {
      setScreenedStocks([]); // Limpiar resultados de screening
    }
  };

  const handleCreateWatchlistWithFilters = () => {
    setIsCreatingWatchlistWithFilters(true);
    setShowFilters(true);
  };

  const useLegacyLayout = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('legacy');

  if (!useLegacyLayout) {
    return (
      <ProfessionalWorkspace
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        dataProvider={dataProvider}
        loadError={loadError}
        lastUpdate={lastUpdate}
        loading={loading}
        presetSyncing={presetSyncing}
        firstMinerviniWatchlistId={firstMinerviniWatchlistId}
        onOpenMinerviniLists={handleOpenMinerviniLists}
        onOpenSetupLab={() => setShowSetupLab(true)}
        onOpenFilters={() => setShowFilters(true)}
        onRefresh={handleRefresh}
        activeFilters={activeFilters}
        viewMode={viewMode}
        activeWatchlist={activeWatchlist}
        screenedStocks={screenedStocks}
        watchlists={watchlists}
        onSelectAll={() => {
          setViewMode('all');
          setActiveWatchlist(null);
          setScreenedStocks([]);
          setActiveFilters({});
        }}
        onSelectIndices={() => {
          setViewMode('indices');
          setActiveWatchlist(null);
          setScreenedStocks([]);
          setActiveFilters({});
        }}
        onSelectWatchlist={(id) => {
          setActiveWatchlist(id);
          setScreenedStocks([]);
          setActiveFilters({});
          if (id === null) setViewMode('all');
        }}
        onCreateWatchlist={handleCreateWatchlist}
        onDeleteWatchlist={handleDeleteWatchlist}
        onRenameWatchlist={handleRenameWatchlist}
        onCreateWithFilters={handleCreateWatchlistWithFilters}
        stocks={intelligenceStocks}
        intelligenceUniverse={intelligenceUniverse}
        selectedStock={intelligenceSelectedStock}
        onSelectStock={handleStockSelect}
        fundamentals={fundamentals}
        fundamentalsLoading={fundamentalsLoading}
        fundamentalsError={fundamentalsError}
        showInfoSidebar={showInfoSidebar}
        setShowInfoSidebar={setShowInfoSidebar}
        marketPulse={marketPulse}
        showFundamentals={showFundamentals}
        setShowFundamentals={setShowFundamentals}
        showFilters={showFilters}
        closeFilters={() => {
          setShowFilters(false);
          if (isCreatingWatchlistWithFilters) setIsCreatingWatchlistWithFilters(false);
        }}
        applyFilters={handleApplyFilters}
        isCreatingWatchlistWithFilters={isCreatingWatchlistWithFilters}
        showSetupLab={showSetupLab}
        closeSetupLab={() => setShowSetupLab(false)}
        onSetupSaved={refreshSelectedStockSetup}
        onApplyIntelligence={(results, label) => {
          setScreenedStocks(results);
          setActiveWatchlist(null);
          setActiveFilters({});
          if (results.length > 0) setSelectedStock(results[0]);
          console.log(`[sepa] Radar aplicado: ${label} (${results.length} acciones)`);
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-dark-300/95">
      {/* Header con Watchlists */}
      <header className="bg-dark-200/95 border-b border-gray-700 px-6 py-3 shadow-lg shadow-black/20">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-accent-blue" size={28} />
            <div>
              <h1 className="text-xl font-bold text-white">Stock Screener Pro</h1>
              <p className="text-xs text-gray-400">
                {lastUpdate && `Ultima actualizacion: ${lastUpdate.toLocaleTimeString()}`}
              </p>
            </div>

            {/* Section tabs */}
            <div className="flex items-center gap-1 ml-6 bg-dark-300 rounded-lg p-0.5">
              <button
                onClick={() => setActiveSection('screener')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeSection === 'screener'
                    ? 'bg-accent-blue text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <BarChart3 size={13} /> Screener
              </button>
              <button
                onClick={() => setActiveSection('email')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeSection === 'email'
                    ? 'bg-accent-blue text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Mail size={13} /> Correo
              </button>
            </div>
          </div>
          
          {activeSection === 'screener' && <div className="flex items-center gap-3">
            <button
              onClick={handleOpenMinerviniLists}
              disabled={loading || presetSyncing || !firstMinerviniWatchlistId}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Abrir y sincronizar listas Minervini"
            >
              {presetSyncing ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Listas MM...
                </>
              ) : (
                <>Listas MM</>
              )}
            </button>

            <button
              onClick={() => setShowSetupLab(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Analizar rendimiento de tags y setups"
            >
              Setup Lab
            </button>

            {/* Boton de filtros */}
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
              onClick={handleRefresh}
              disabled={loading}
              className="bg-accent-blue hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Forzar actualizacion (limpia cache)"
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
          </div>}
        </div>

        {/* Watchlists Horizontal con modos integrados - solo en screener */}
        {activeSection === 'screener' && <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {/* Botones de Modo */}
          <button
            onClick={() => {
              setViewMode('all');
              setActiveWatchlist(null);
              setScreenedStocks([]);
              setActiveFilters({});
            }}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              viewMode === 'all' && !activeWatchlist && screenedStocks.length === 0
                ? 'bg-accent-blue text-white'
                : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => {
              setViewMode('indices');
              setActiveWatchlist(null);
              setScreenedStocks([]);
              setActiveFilters({});
            }}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg transition-colors text-sm font-medium ${
              viewMode === 'indices' && !activeWatchlist
                ? 'bg-accent-blue text-white'
                : 'bg-dark-100 text-gray-300 hover:bg-dark-300'
            }`}
          >
            Indices
          </button>

          {/* Mostrar resultados de filtrado como una pestana especial */}
          {screenedStocks.length > 0 && (
            <button
              className="whitespace-nowrap px-4 py-1.5 rounded-lg transition-colors text-sm font-medium bg-green-600 text-white"
            >
              Resultados del filtro
            </button>
          )}

          {/* Separator */}
          <div className="h-6 w-px bg-gray-600 mx-2"></div>

          {/* Watchlists Panel integrado */}
          <WatchlistPanel
            watchlists={watchlists}
            activeWatchlist={activeWatchlist}
            onSelectWatchlist={(id) => {
              setActiveWatchlist(id);
              setScreenedStocks([]);
              setActiveFilters({});
              if (id === null) {
                // Al seleccionar "Todas las Acciones", volver a modo "all"
                setViewMode('all');
              }
            }}
            onCreateWatchlist={handleCreateWatchlist}
            onDeleteWatchlist={handleDeleteWatchlist}
            onRenameWatchlist={handleRenameWatchlist}
            onCreateWithFilters={handleCreateWatchlistWithFilters}
            onRefreshPresets={handleOpenMinerviniLists}
          />
        </div>}
      </header>

      {/* Email section */}
      {activeSection === 'email' && <EmailPanel />}

      {/* Main Content - 2 columnas: Sidebar Table | Grafico */}
      {activeSection === 'screener' && (
      <div className="flex-1 flex overflow-hidden min-w-0" style={{ minHeight: 0 }}>
        {/* Columna 1: Tabla de acciones con scroll (izquierda) */}
        {loading && stocks.length === 0 ? (
          <div className="w-96 bg-dark-200 border-r border-gray-700 flex items-center justify-center">
            <div className="text-center p-8">
              <Loader className="animate-spin text-accent-blue mx-auto mb-4" size={48} />
              <p className="text-lg text-gray-400">Cargando acciones...</p>
            </div>
          </div>
        ) : (
          <StockSidebar
            stocks={getFilteredStocks()}
            selectedStock={selectedStock}
            onSelectStock={handleStockSelect}
          />
        )}
        
        {/* Columna 2: Grafico + Fundamentales + Sidebar Info */}
        <div className="flex-1 flex overflow-hidden relative min-w-0">
          {selectedStock ? (
            <>
              {/* Grafico + Fundamentales */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0">
                <div className="flex-1 min-h-0">
                  <TradingViewChart symbol={selectedStock.symbol} theme="dark" />
                </div>
                
                {canDisplayFundamentals && fundamentalsLoading && (
                  <div className="border-t border-gray-700 bg-dark-200 px-3 py-2 text-xs text-gray-400">
                    Cargando fundamentales trimestrales...
                  </div>
                )}

                {canDisplayFundamentals && !fundamentalsLoading && fundamentalsError && (
                  <div className="border-t border-gray-700 bg-dark-200 px-3 py-2 text-xs text-amber-300">
                    {fundamentalsError}
                  </div>
                )}

                {canDisplayFundamentals && !fundamentalsLoading && fundamentals && fundamentals.quarterlyData && fundamentals.quarterlyData.length > 0 && (
                  <FundamentalsStrip fundamentals={fundamentals} />
                )}
              </div>
              
              {/* Sidebar de informacion (precio/medias moviles) - colapsable */}
              {showInfoSidebar && (
                <div className="bg-dark-200 border-l border-gray-700 flex flex-col overflow-y-auto overflow-x-hidden relative z-10 w-80 shrink-0 h-full">
                  {/* Boton de cerrar */}
                  <div className="absolute left-2 top-4 z-10">
                    <button
                      onClick={() => setShowInfoSidebar(false)}
                      className="bg-dark-200 hover:bg-dark-100 text-white p-1.5 rounded-lg border border-gray-700 transition-colors shadow-lg"
                      title="Ocultar informacion"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-4 pl-10">
                    <div className="mb-4">
                      <h2 className="text-2xl font-bold text-white">{selectedStock.symbol}</h2>
                      <p className="text-sm text-gray-400 mt-1">{selectedStock.name}</p>
                    </div>
                    
                    {/* Tabla de informacion */}
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
                    
                    {/* Medias moviles */}
                    <div className="mt-4 border-t border-gray-700 pt-4">
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">Medias moviles</h3>
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
                    
                    <SetupPanel
                      stock={selectedStock}
                      onSaved={refreshSelectedStockSetup}
                    />

                    {fundamentals && fundamentals.quarterlyData && fundamentals.quarterlyData.length > 0 && (
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
              
              {/* Boton para mostrar sidebar info (cuando esta oculto) */}
              {!showInfoSidebar && (
                <button
                  onClick={() => setShowInfoSidebar(true)}
                  className="absolute top-4 right-4 z-20 bg-dark-200 hover:bg-dark-100 text-white p-2 rounded-lg border border-gray-700 transition-colors shadow-lg"
                  title="Mostrar informacion de precio"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <BarChart3 size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Selecciona una accion del panel izquierdo</p>
                <p className="text-sm mt-2">para ver el grafico profesional</p>
              </div>
            </div>
          )}
        </div>
      </div>

      )}

      {/* Fundamentals Modal */}
      {showFundamentals && selectedStock && fundamentals && (
        <FundamentalsView
          symbol={selectedStock.symbol}
          quarterlyData={fundamentals.quarterlyData}
          source={fundamentals.source}
          updatedAt={fundamentals.updatedAt}
          onClose={() => {
            setShowFundamentals(false);
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
          isCreatingWatchlist={isCreatingWatchlistWithFilters}
        />
      )}

      <SetupLabModal
        isOpen={showSetupLab}
        onClose={() => setShowSetupLab(false)}
      />

      {/*
      Asistente Fresa AI desactivado temporalmente. Descomentar este bloque,
      el import y fresaPetState para volver a mostrarlo.
      <FresaAIPet
        state={fresaPetState}
        unreadCount={activeSection === 'email' ? 0 : Object.keys(activeFilters).length}
        onClick={() => setActiveSection('email')}
      />
      */}

      {/* Info Banner */}
      <div className="bg-green-500/10 border-t border-green-500/20 px-6 py-2 text-center">
        <p className="text-green-400 text-sm">
          <strong>PRODUCCION:</strong> Datos reales de TradingView Scanner API + Graficos profesionales.
          {Object.keys(activeFilters).length > 0 && ` Filtros activos: ${Object.keys(activeFilters).length}.`}
          {' '}Todo gratis y completamente funcional.
        </p>
      </div>
    </div>
  );
}

export default App;
