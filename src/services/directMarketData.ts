import axios from 'axios';
import { MinerviniPresetListsResponse, Stock, StockSetupProfile } from '../types';

const TRADINGVIEW_SCANNER_URL = 'https://scanner.tradingview.com/america/scan';
const DIRECT_MARKET_LIMIT = 2800;

const MARKET_COLUMNS = [
  'name',
  'description',
  'sector',
  'industry',
  'close',
  'change',
  'change_abs',
  'open',
  'high',
  'low',
  'volume',
  'Value.Traded',
  'average_volume_30d_calc',
  'relative_volume_10d_calc',
  'market_cap_basic',
  'price_52_week_high',
  'price_52_week_low',
  'first_bar_time',
  'float_shares_outstanding',
  'price_earnings_ttm',
  'SMA20',
  'SMA50',
  'SMA100',
  'SMA150',
  'SMA200',
  'EMA20',
  'EMA50',
  'Perf.1M',
  'Perf.3M',
  'Perf.6M',
  'Perf.Y',
  'earnings_per_share_diluted_ttm',
  'earnings_per_share_diluted_yoy_growth_ttm',
  'total_revenue',
  'total_revenue_yoy_growth_ttm',
  'gross_margin',
  'operating_margin',
  'net_margin',
] as const;

const INDEX_TICKERS = [
  'SP:SPX',
  'DJ:DJI',
  'NASDAQ:IXIC',
  'RUSSELL:RUT',
  'CBOE:VIX',
  'TVC:US10Y',
];

const INDEX_SYMBOLS: Record<string, string> = {
  'SP:SPX': '^GSPC',
  'DJ:DJI': '^DJI',
  'NASDAQ:IXIC': '^IXIC',
  'RUSSELL:RUT': '^RUT',
  'CBOE:VIX': '^VIX',
  'TVC:US10Y': '^TNX',
};

const numeric = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const percentileRank = (values: number[], value: number): number => {
  if (values.length <= 1) return 50;
  let belowOrEqual = 0;
  values.forEach((candidate) => {
    if (candidate <= value) belowOrEqual += 1;
  });
  return Math.max(1, Math.min(99, Math.round((belowOrEqual / values.length) * 99)));
};

const buildSetupProfile = (stock: Stock): StockSetupProfile => {
  let score = 0;
  const tags: string[] = [];
  const positives: string[] = [];
  const negatives: string[] = [];

  const above50 = stock.sma50 > 0 && stock.price > stock.sma50;
  const above150 = stock.sma150 > 0 && stock.price > stock.sma150;
  const above200 = stock.sma200 > 0 && stock.price > stock.sma200;
  const alignedTrend = stock.sma50 > stock.sma150 && stock.sma150 > stock.sma200;
  const distanceFromHigh = stock.price52WeekHigh
    ? ((stock.price52WeekHigh - stock.price) / stock.price52WeekHigh) * 100
    : 100;

  if (above50) { score += 16; positives.push('Precio sobre SMA 50'); }
  else negatives.push('Precio bajo SMA 50');
  if (above150) score += 12;
  if (above200) { score += 12; positives.push('Precio sobre SMA 200'); }
  if (alignedTrend) { score += 18; tags.push('trend-template'); positives.push('Medias alineadas'); }
  if (stock.relativeStrength >= 90) { score += 22; tags.push('rs-90+'); positives.push('Liderazgo relativo'); }
  else if (stock.relativeStrength >= 75) { score += 14; tags.push('high-rs'); }
  else if (stock.relativeStrength >= 60) score += 8;
  if (distanceFromHigh <= 8) { score += 12; tags.push('near-high'); positives.push('Cerca de máximo anual'); }
  else if (distanceFromHigh <= 15) score += 7;
  if ((stock.relativeVolume10d || 0) >= 1.3) { score += 8; tags.push('volume-expansion'); }

  score = Math.min(100, score);
  const state = score >= 78 ? 'Actionable' : score >= 65 ? 'Close' : score >= 48 ? 'Watch' : 'Reject';
  const type = alignedTrend ? 'Trend Template' : above200 ? 'Trend en construcción' : 'Sin estructura confirmada';
  const style = state === 'Actionable'
    ? { color: '#40dca5', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', rowClass: '' }
    : state === 'Close'
      ? { color: '#f6c85f', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30', rowClass: '' }
      : state === 'Watch'
        ? { color: '#70a1ff', badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30', rowClass: '' }
        : { color: '#7f8b9d', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30', rowClass: '' };

  return {
    state,
    score,
    hardPass: state === 'Actionable',
    type,
    tags,
    autoTags: tags,
    manualTags: [],
    style,
    positives,
    negatives,
    reviewFlags: [],
  };
};
const mapRows = (rows: Array<{ s: string; d: unknown[] }>): Stock[] => {
  const mapped = rows.map((row) => {
    const fields = Object.fromEntries(MARKET_COLUMNS.map((column, index) => [column, row.d[index]]));
    const ticker = String(fields.name || row.s.split(':').pop() || row.s);
    const symbol = INDEX_SYMBOLS[row.s] || ticker;
    const price = numeric(fields.close);
    const changePercent = numeric(fields.change);
    const changeAbsolute = numeric(fields.change_abs);
    const prevClose = changeAbsolute !== 0
      ? price - changeAbsolute
      : price / Math.max(0.01, 1 + changePercent / 100);
    const performanceScore =
      numeric(fields['Perf.1M']) * 0.1 +
      numeric(fields['Perf.3M']) * 0.25 +
      numeric(fields['Perf.6M']) * 0.3 +
      numeric(fields['Perf.Y']) * 0.35;

    return {
      performanceScore,
      stock: {
        symbol,
        name: String(fields.description || ticker),
        sector: fields.sector ? String(fields.sector) : null,
        industry: fields.industry ? String(fields.industry) : null,
        price,
        prevClose,
        changePercent,
        high: numeric(fields.high),
        low: numeric(fields.low),
        open: numeric(fields.open),
        volume: numeric(fields.volume),
        dollarVolume: numeric(fields['Value.Traded']),
        averageVolume30d: numeric(fields.average_volume_30d_calc),
        relativeVolume10d: numeric(fields.relative_volume_10d_calc),
        marketCap: numeric(fields.market_cap_basic),
        price52WeekHigh: numeric(fields.price_52_week_high),
        price52WeekLow: numeric(fields.price_52_week_low),
        firstBarTime: numeric(fields.first_bar_time) || null,
        floatShares: numeric(fields.float_shares_outstanding),
        peRatio: numeric(fields.price_earnings_ttm),
        sma20: numeric(fields.SMA20),
        sma50: numeric(fields.SMA50),
        sma100: numeric(fields.SMA100),
        sma150: numeric(fields.SMA150),
        sma200: numeric(fields.SMA200),
        ema20: numeric(fields.EMA20),
        ema50: numeric(fields.EMA50),
        perf1M: numeric(fields['Perf.1M']),
        perf3M: numeric(fields['Perf.3M']),
        perf6M: numeric(fields['Perf.6M']),
        perfY: numeric(fields['Perf.Y']),
        relativeStrength: 50,
        fundamentals: {
          symbol,
          hasFundamentals: numeric(fields.earnings_per_share_diluted_ttm) !== 0 || numeric(fields.total_revenue) !== 0,
          coverage: 'fresh' as const,
          updatedAt: new Date().toISOString(),
          latestPeriodEnd: null,
          latestReportedDate: null,
          quarterlyPoints: 0,
          eps: numeric(fields.earnings_per_share_diluted_ttm),
          epsGrowth: numeric(fields.earnings_per_share_diluted_yoy_growth_ttm),
          revenue: numeric(fields.total_revenue),
          revenueGrowth: numeric(fields.total_revenue_yoy_growth_ttm),
          grossMargin: numeric(fields.gross_margin),
          operatingMargin: numeric(fields.operating_margin),
          netMargin: numeric(fields.net_margin),
        },
        lastUpdate: new Date().toISOString(),
        quoteStatus: price > 0 ? 'ok' as const : 'unavailable' as const,
      },
    };
  });

  const scoreUniverse = mapped
    .map((entry) => entry.performanceScore)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  return mapped.map(({ stock, performanceScore }) => {
    const enrichedStock = {
      ...stock,
      relativeStrength: percentileRank(scoreUniverse, performanceScore),
    } as Stock;
    enrichedStock.setupProfile = buildSetupProfile(enrichedStock);
    return enrichedStock;
  });
};

const postScanner = async (payload: Record<string, unknown>): Promise<Stock[]> => {
  const response = await axios.post(TRADINGVIEW_SCANNER_URL, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 45000,
  });
  return mapRows(response.data?.data || []);
};

export const fetchDirectMarket = async (mode: 'default' | 'all' | 'indices' = 'all'): Promise<Stock[]> => {
  if (mode === 'indices') {
    return postScanner({
      symbols: { tickers: INDEX_TICKERS, query: { types: [] } },
      columns: MARKET_COLUMNS,
    });
  }

  return postScanner({
    filter: [
      { left: 'type', operation: 'equal', right: 'stock' },
      { left: 'close', operation: 'greater', right: 1 },
      { left: 'volume', operation: 'greater', right: 50000 },
    ],
    options: { lang: 'es' },
    markets: ['america'],
    symbols: { query: { types: [] }, tickers: [] },
    columns: MARKET_COLUMNS,
    sort: { sortBy: 'Value.Traded', sortOrder: 'desc' },
    range: [0, DIRECT_MARKET_LIMIT],
  });
};

export const fetchDirectSymbols = async (symbols: string[]): Promise<Stock[]> => {
  if (symbols.length === 0) return [];
  const tickers = symbols.map((symbol) => {
    const indexTicker = Object.entries(INDEX_SYMBOLS).find(([, local]) => local === symbol)?.[0];
    if (indexTicker) return indexTicker;
    return symbol.includes(':') ? symbol : symbol;
  });

  return postScanner({
    symbols: { tickers, query: { types: [] } },
    columns: MARKET_COLUMNS,
  });
};

export const applyDirectFilters = (stocks: Stock[], filters: Record<string, unknown>): Stock[] => {
  const numberFilter = (key: string): number | undefined => {
    const value = Number(filters[key]);
    return filters[key] !== undefined && Number.isFinite(value) ? value : undefined;
  };

  return stocks.filter((stock) => {
    const minPrice = numberFilter('minPrice');
    const maxPrice = numberFilter('maxPrice');
    const minRS = numberFilter('minRS');
    const maxRS = numberFilter('maxRS');
    const minVolume = numberFilter('minVolume');
    const priceChangeMin = numberFilter('priceChangeMin');
    const priceChangeMax = numberFilter('priceChangeMax');
    if (minPrice !== undefined && stock.price < minPrice) return false;
    if (maxPrice !== undefined && stock.price > maxPrice) return false;
    if (minRS !== undefined && stock.relativeStrength < minRS) return false;
    if (maxRS !== undefined && stock.relativeStrength > maxRS) return false;
    if (minVolume !== undefined && stock.volume / 1_000_000 < minVolume) return false;
    if (priceChangeMin !== undefined && stock.changePercent < priceChangeMin) return false;
    if (priceChangeMax !== undefined && stock.changePercent > priceChangeMax) return false;
    if (filters.aboveSMA50 === true && !(stock.sma50 > 0 && stock.price > stock.sma50)) return false;
    if (filters.aboveSMA150 === true && !(stock.sma150 > 0 && stock.price > stock.sma150)) return false;
    if (filters.aboveSMA200 === true && !(stock.sma200 > 0 && stock.price > stock.sma200)) return false;
    if (filters.aboveEMA20 === true && !(stock.ema20 > 0 && stock.price > stock.ema20)) return false;
    if (filters.aboveEMA50 === true && !(stock.ema50 > 0 && stock.price > stock.ema50)) return false;

    const fundamentals = stock.fundamentals;
    if (filters.requireFundamentals === true && !fundamentals?.hasFundamentals) return false;
    const fundamentalThresholds: Array<[string, keyof NonNullable<Stock['fundamentals']>]> = [
      ['epsGrowthMin', 'epsGrowth'],
      ['revenueGrowthMin', 'revenueGrowth'],
      ['grossMarginMin', 'grossMargin'],
      ['operatingMarginMin', 'operatingMargin'],
      ['netMarginMin', 'netMargin'],
    ];
    for (const [filterKey, stockKey] of fundamentalThresholds) {
      const threshold = numberFilter(filterKey);
      const actual = Number(fundamentals?.[stockKey]);
      if (threshold !== undefined && (!Number.isFinite(actual) || actual < threshold)) return false;
    }
    return true;
  });
};

export const buildDirectPresetLists = (stocks: Stock[]): MinerviniPresetListsResponse => {
  const trendTemplate = stocks.filter((stock) =>
    stock.price > stock.sma50 &&
    stock.price > stock.sma150 &&
    stock.price > stock.sma200 &&
    stock.sma50 > stock.sma150 &&
    stock.sma150 > stock.sma200 &&
    stock.relativeStrength >= 70
  );
  const leadership = stocks.filter((stock) => stock.relativeStrength >= 90 && (stock.perf6M || 0) > 15);
  const nearBreakout = stocks.filter((stock) => {
    const high = stock.price52WeekHigh || 0;
    const distance = high > 0 ? ((high - stock.price) / high) * 100 : 100;
    return distance <= 6 && stock.relativeStrength >= 80 && stock.price > stock.sma50;
  });

  const createPreset = (id: string, name: string, description: string, candidates: Stock[]) => ({
    id,
    name,
    description,
    count: candidates.length,
    symbols: candidates.map((stock) => stock.symbol),
    preview: candidates.slice(0, 8).map((stock) => ({
      symbol: stock.symbol,
      score: stock.setupProfile?.score || 0,
      setupType: stock.setupProfile?.type,
      tags: stock.setupProfile?.tags,
      rs: stock.relativeStrength,
      revenueGrowth: stock.fundamentals?.revenueGrowth,
      epsGrowth: stock.fundamentals?.epsGrowth,
    })),
  });

  return {
    generatedAt: new Date().toISOString(),
    marketRegime: { state: 'Direct market intelligence' },
    presets: [
      createPreset('trend-template', 'Trend Template', 'Líderes con medias alineadas y RS superior.', trendTemplate),
      createPreset('market-leaders', 'Líderes RS 90+', 'Acciones en el decil superior de fuerza relativa.', leadership),
      createPreset('near-breakout', 'Cerca de ruptura', 'Líderes a menos de 6% de su máximo anual.', nearBreakout),
    ],
  };
};
