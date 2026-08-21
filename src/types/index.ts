export type SetupState = 'Actionable' | 'Close' | 'Watch' | 'Uncovered' | 'Reject';
export type SetupFeedbackVerdict = 'approved' | 'maybe' | 'reject' | 'watch' | 'skip';

export interface SetupStyle {
  color: string;
  badgeClass: string;
  rowClass: string;
}

export interface SetupPatternSummary {
  reboundsEstimate?: number | null;
  baseWeeksEstimate?: number | null;
  yearsSinceListing?: number | null;
}

export interface SetupFeedbackEntry {
  symbol: string;
  date: string;
  verdict: SetupFeedbackVerdict;
  tags: string[];
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockSetupProfile {
  state: SetupState | string;
  score: number;
  hardPass: boolean;
  type: string;
  tags: string[];
  autoTags: string[];
  manualTags: string[];
  style: SetupStyle;
  pattern?: SetupPatternSummary;
  feedback?: SetupFeedbackEntry | null;
  positives?: string[];
  negatives?: string[];
  reviewFlags?: string[];
  metrics?: Record<string, number | null>;
}

export interface Stock {
  symbol: string;
  name: string;
  sector?: string | null;
  industry?: string | null;
  price: number;
  prevClose: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  marketCap: number;
  dollarVolume?: number;
  averageVolume30d?: number;
  relativeVolume10d?: number;
  price52WeekHigh?: number;
  price52WeekLow?: number;
  firstBarTime?: number | null;
  floatShares?: number;
  peRatio?: number;
  sma20: number;
  sma50: number;
  sma100?: number;
  sma150: number;
  sma200: number;
  ema20: number;
  ema50: number;
  perf1M?: number;
  perf3M?: number;
  perf6M?: number;
  perfY?: number;
  relativeStrength: number;
  quoteStatus?: 'ok' | 'unavailable';
  fundamentals?: StockFundamentalSummary;
  setupProfile?: StockSetupProfile;
  lastUpdate: string | Date;
}

export interface StockFundamentalSummary {
  symbol: string;
  hasFundamentals: boolean;
  coverage: 'fresh' | 'stale' | 'missing';
  updatedAt?: string | null;
  latestPeriodEnd?: string | null;
  latestReportedDate?: string | null;
  quarterlyPoints: number;
  eps?: number | null;
  epsGrowth?: number | null;
  revenue?: number | null;
  revenueGrowth?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  epsAcceleration?: boolean | null;
  revenueAcceleration?: boolean | null;
}

export interface QuarterlyData {
  quarter: string;
  year: number;
  periodEnd: string;
  reportedDate?: string | null;
  fiscalYear?: number | null;
  fiscalQuarter?: number | null;
  eps: number | null;
  epsBasis?: 'reported' | 'reported-ytd-delta' | 'derived-from-filing' | 'derived' | null;
  epsGrowth: number | null;
  revenue: number | null;
  revenueGrowth: number | null;
  grossMargin: number | null;
  medicalExpenseRatio?: number | null;
  sgaExpenseRatio?: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
}

export interface StockFundamentals {
  symbol: string;
  source?: string;
  basis?: string;
  schemaVersion?: number;
  updatedAt?: string;
  quarterlyData: QuarterlyData[];
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: Date;
  filters?: any; // Filtros usados para crear la lista (para re-ejecutar)
  isDynamic?: boolean; // Si es true, re-ejecuta filtros al cargar
  lastSyncedAt?: string; // Ultima sincronizacion automatica de listas dinamicas
  presetId?: string;
  presetDescription?: string;
  isBuiltIn?: boolean;
}

export interface MinerviniPresetPreview {
  symbol: string;
  score: number;
  setupType?: string;
  tags?: string[];
  rs?: number | null;
  revenueGrowth?: number | null;
  epsGrowth?: number | null;
}

export interface MinerviniPresetList {
  id: string;
  name: string;
  description: string;
  count: number;
  symbols: string[];
  preview: MinerviniPresetPreview[];
}

export interface MinerviniPresetListsResponse {
  generatedAt: string;
  marketRegime?: {
    state: string;
    score?: number;
  };
  presets: MinerviniPresetList[];
}

export interface SetupAnalyticsHorizonSummary {
  samples: number;
  avgReturn: number | null;
  medianReturn: number | null;
  winRate: number | null;
  p10: number | null;
  p90: number | null;
}

export interface SetupAnalyticsTagStat {
  tag: string;
  occurrences: number;
  avgScore: number | null;
  stateCounts: Record<string, number>;
  horizons: Record<string, SetupAnalyticsHorizonSummary>;
}

export interface SetupAnalyticsResponse {
  generatedAt: string;
  snapshotDays: number;
  fromDate: string | null;
  toDate: string | null;
  horizons: number[];
  minSamples: number;
  tagStats: SetupAnalyticsTagStat[];
}

export interface SetupFeedbackListResponse {
  count: number;
  entries: SetupFeedbackEntry[];
}

export interface SetupFeedbackSaveResponse {
  status: 'ok';
  entry: SetupFeedbackEntry;
}

export interface ScreenerFilters {
  priceMin?: number;
  priceMax?: number;
  volumeMin?: number;
  marketCapMin?: number;
  aboveSMA20?: boolean;
  aboveSMA50?: boolean;
  aboveSMA200?: boolean;
  rsMin?: number;
  epsGrowthMin?: number;
  revenueGrowthMin?: number;
  grossMarginMin?: number;
  operatingMarginMin?: number;
  netMarginMin?: number;
  requireFundamentals?: boolean;
}
