import axios from 'axios';
import { apiUrl, shouldPreferDirectMarketData } from '../config/runtime';
import {
  MinerviniPresetListsResponse,
  SetupAnalyticsResponse,
  SetupFeedbackEntry,
  SetupFeedbackListResponse,
  SetupFeedbackSaveResponse,
  SetupFeedbackVerdict,
  Stock,
  StockFundamentals,
} from '../types';
import {
  applyDirectFilters,
  buildDirectPresetLists,
  fetchDirectMarket,
  fetchDirectSymbols,
} from './directMarketData';

export interface StockDataResponse {
  data: Stock[];
  total?: number;
  provider?: 'local-engine' | 'direct-market' | 'cache';
  marketRegime?: {
    state: string;
    score?: number;
    generatedAt?: string;
  };
}

class StockDataService {
  private screenerCache = new Map<string, StockDataResponse>();
  private symbolRequestCache = new Map<string, StockDataResponse>();
  private pendingDirectRequests = new Map<string, Promise<StockDataResponse>>();

  async getScreenerData(mode: 'default' | 'all' | 'indices' = 'all'): Promise<StockDataResponse> {
    if (shouldPreferDirectMarketData) return this.getDirectScreenerData(mode);

    try {
      const response = await axios.get(apiUrl('/stocks'), {
        params: { mode },
        timeout: 120000,
      });
      const payload: StockDataResponse = Array.isArray(response.data)
        ? { data: response.data, total: response.data.length, provider: 'local-engine' }
        : { ...response.data, provider: 'local-engine' };
      this.screenerCache.set(mode, payload);
      return payload;
    } catch (error) {
      console.warn('[market] Motor local no disponible; activando mercado directo.', error);
      const cached = this.screenerCache.get(mode);
      if (cached) return { ...cached, provider: 'cache' };
      return this.getDirectScreenerData(mode);
    }
  }

  async getStocksBySymbols(symbols: string[]): Promise<StockDataResponse> {
    if (!symbols?.length) return { data: [], total: 0 };

    const normalizedSymbols = symbols.map((symbol) => symbol.toUpperCase());
    const cacheKey = normalizedSymbols.join(',');
    const directUniverse = this.screenerCache.get('direct:all')?.data || [];

    if (shouldPreferDirectMarketData && directUniverse.length > 0) {
      return this.pickSymbols(directUniverse, normalizedSymbols);
    }

    if (!shouldPreferDirectMarketData) {
      try {
        const response = await axios.get(apiUrl('/stocks'), {
          params: { symbols: normalizedSymbols.join(',') },
          timeout: 120000,
        });
        const payload: StockDataResponse = Array.isArray(response.data)
          ? { data: response.data, total: response.data.length, provider: 'local-engine' }
          : { ...response.data, provider: 'local-engine' };
        this.symbolRequestCache.set(cacheKey, payload);
        return payload;
      } catch (error) {
        console.warn('[market] Consulta local de símbolos no disponible.', error);
        const cached = this.symbolRequestCache.get(cacheKey);
        if (cached) return { ...cached, provider: 'cache' };
      }
    }

    try {
      const data = await fetchDirectSymbols(normalizedSymbols);
      if (data.length > 0) return { data, total: data.length, provider: 'direct-market' };
    } catch (error) {
      console.warn('[market] La consulta directa por símbolo falló; usando el universo líquido.', error);
    }

    const universe = await this.getDirectScreenerData('all');
    return this.pickSymbols(universe.data, normalizedSymbols);
  }

  async screenStocks(filters: Record<string, unknown>): Promise<Stock[]> {
    if (!shouldPreferDirectMarketData) {
      try {
        const response = await axios.post(apiUrl('/screen'), filters, { timeout: 120000 });
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.warn('[screen] Motor local no disponible; filtrando el mercado directo.', error);
      }
    }

    const universe = await this.getDirectScreenerData('all');
    return applyDirectFilters(universe.data, filters);
  }

  async clearCache(): Promise<void> {
    this.screenerCache.clear();
    this.symbolRequestCache.clear();
    this.pendingDirectRequests.clear();
    if (shouldPreferDirectMarketData) return;
    try {
      await axios.post(apiUrl('/cache/clear'), undefined, { timeout: 10000 });
    } catch (error) {
      console.warn('[cache] No se pudo limpiar el cache del motor local.', error);
    }
  }

  async getStockFundamentals(symbol: string): Promise<StockFundamentals | null> {
    if (shouldPreferDirectMarketData) return null;
    try {
      const response = await axios.get(apiUrl(`/fundamentals/${symbol}`), { timeout: 20000 });
      return this.normalizeFundamentals(response.data as StockFundamentals);
    } catch (error) {
      console.warn(`[fundamentals] No se pudieron cargar los trimestres de ${symbol}.`, error);
      return null;
    }
  }

  async getMinerviniPresetLists(forceRefresh = false): Promise<MinerviniPresetListsResponse> {
    if (!shouldPreferDirectMarketData) {
      try {
        const response = await axios.get(apiUrl('/minervini/presets'), {
          params: { forceRefresh },
          timeout: 240000,
        });
        return response.data as MinerviniPresetListsResponse;
      } catch (error) {
        console.warn('[presets] Generando listas desde el mercado directo.', error);
      }
    }
    const universe = await this.getDirectScreenerData('all');
    return buildDirectPresetLists(universe.data);
  }

  async getSetupAnalytics(horizons: number[] = [5, 10, 20], minSamples = 15): Promise<SetupAnalyticsResponse> {
    if (shouldPreferDirectMarketData) {
      return {
        generatedAt: new Date().toISOString(),
        snapshotDays: 0,
        fromDate: null,
        toDate: null,
        horizons,
        minSamples,
        tagStats: [],
      };
    }
    const response = await axios.get(apiUrl('/setups/analytics'), {
      params: { horizons: horizons.join(','), minSamples },
      timeout: 60000,
    });
    return response.data as SetupAnalyticsResponse;
  }

  async getSetupFeedback(symbol?: string, limit = 200): Promise<SetupFeedbackListResponse> {
    if (!shouldPreferDirectMarketData) {
      try {
        const response = await axios.get(apiUrl('/setups/feedback'), {
          params: { symbol, limit },
          timeout: 30000,
        });
        return response.data as SetupFeedbackListResponse;
      } catch (error) {
        console.warn('[feedback] Leyendo feedback guardado en este dispositivo.', error);
      }
    }

    try {
      const stored = JSON.parse(localStorage.getItem('screener:setup-feedback') || '{}') as Record<string, SetupFeedbackEntry>;
      const entries = Object.values(stored)
        .filter((entry) => !symbol || entry.symbol === symbol)
        .slice(0, limit);
      return { count: entries.length, entries };
    } catch {
      return { count: 0, entries: [] };
    }
  }

  async saveSetupFeedback(payload: {
    symbol: string;
    date?: string;
    verdict?: SetupFeedbackVerdict;
    tags?: string[];
    notes?: string;
  }): Promise<SetupFeedbackEntry> {
    if (!shouldPreferDirectMarketData) {
      try {
        const response = await axios.post(apiUrl('/setups/feedback'), payload, { timeout: 30000 });
        return (response.data as SetupFeedbackSaveResponse).entry;
      } catch (error) {
        console.warn('[feedback] Guardando feedback en este dispositivo.', error);
      }
    }

    const entry: SetupFeedbackEntry = {
      symbol: payload.symbol,
      date: payload.date || new Date().toISOString().slice(0, 10),
      verdict: payload.verdict || 'watch',
      tags: payload.tags || [],
      notes: payload.notes || '',
      updatedAt: new Date().toISOString(),
    };
    try {
      const storageKey = 'screener:setup-feedback';
      const existing = JSON.parse(localStorage.getItem(storageKey) || '{}');
      existing[payload.symbol] = entry;
      localStorage.setItem(storageKey, JSON.stringify(existing));
    } catch {}
    return entry;
  }

  private async getDirectScreenerData(mode: 'default' | 'all' | 'indices'): Promise<StockDataResponse> {
    const cacheKey = `direct:${mode}`;
    const cached = this.screenerCache.get(cacheKey);
    if (cached) return cached;
    const pending = this.pendingDirectRequests.get(cacheKey);
    if (pending) return pending;

    const request = (async () => {
      try {
        const data = await fetchDirectMarket(mode);
        const payload: StockDataResponse = {
          data,
          total: data.length,
          provider: 'direct-market',
          marketRegime: { state: 'Live market breadth', generatedAt: new Date().toISOString() },
        };
        this.screenerCache.set(cacheKey, payload);
        return payload;
      } finally {
        this.pendingDirectRequests.delete(cacheKey);
      }
    })();
    this.pendingDirectRequests.set(cacheKey, request);
    return request;
  }

  private pickSymbols(universe: Stock[], normalizedSymbols: string[]): StockDataResponse {
    const symbolSet = new Set(normalizedSymbols);
    const data = universe.filter((stock) => symbolSet.has(stock.symbol.toUpperCase()));
    return { data, total: data.length, provider: 'direct-market' };
  }

  private normalizeFundamentals(data: StockFundamentals): StockFundamentals {
    const parseTime = (value?: string | null): number => {
      if (!value) return 0;
      const parsed = new Date(value).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const finiteOrNull = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const normalized = Number(value);
      return Number.isFinite(normalized) ? normalized : null;
    };
    const quarterOrder = (value: string): number => ({ Q1: 1, Q2: 2, Q3: 3, Q4: 4 }[value] || 0);
    const cleanData = (data.quarterlyData || [])
      .map((quarter) => {
        const year = Number(quarter.year) || 0;
        const normalizedQuarter = String(quarter.quarter || '').toUpperCase();
        const label = normalizedQuarter.startsWith('Q') ? normalizedQuarter : `Q${normalizedQuarter}`;
        return {
          ...quarter,
          quarter: label,
          year,
          periodEnd: quarter.periodEnd || `${year}-${String(Math.max(1, quarterOrder(label)) * 3).padStart(2, '0')}-01`,
          eps: finiteOrNull(quarter.eps),
          epsGrowth: finiteOrNull(quarter.epsGrowth),
          revenue: finiteOrNull(quarter.revenue),
          revenueGrowth: finiteOrNull(quarter.revenueGrowth),
          grossMargin: finiteOrNull(quarter.grossMargin),
          medicalExpenseRatio: finiteOrNull(quarter.medicalExpenseRatio),
          sgaExpenseRatio: finiteOrNull(quarter.sgaExpenseRatio),
          operatingMargin: finiteOrNull(quarter.operatingMargin),
          netMargin: finiteOrNull(quarter.netMargin),
        };
      })
      .filter((quarter) => quarter.year > 0)
      .sort((left, right) => parseTime(left.periodEnd) - parseTime(right.periodEnd));
    return { ...data, quarterlyData: cleanData };
  }
}

export const stockDataService = new StockDataService();
