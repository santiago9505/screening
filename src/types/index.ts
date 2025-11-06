export interface Stock {
  symbol: string;
  name: string;
  price: number;
  prevClose: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  marketCap: number;
  sma20: number;
  sma50: number;
  sma150: number;
  sma200: number;
  ema20: number;
  ema50: number;
  relativeStrength: number;
  lastUpdate: string | Date;
}

export interface QuarterlyData {
  quarter: string;
  year: number;
  eps: number;
  epsGrowth: number;
  revenue: number;
  revenueGrowth: number;
  netMargin: number;
  operatingMargin: number;
  grossMargin: number;
}

export interface StockFundamentals {
  symbol: string;
  quarterlyData: QuarterlyData[];
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: Date;
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
}
