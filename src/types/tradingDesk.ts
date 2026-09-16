export type DeskBucket = 'buy-alert' | 'watchlist' | 'recent-sold' | 'ipo' | 'portfolio';
export interface DeskPlan {
  id: string; setupDate: string; validDate: string; trigger: number; maxEntry: number;
  stop: number; shares: number; plannedRisk: number; armed: boolean; status: string;
}
export interface DeskCandidate {
  symbol: string; name: string; sector: string; bucket: string; rs: number | null;
  metrics: { valid: boolean; close?: number; changePct?: number; pivot?: number; stop?: number;
    distanceToPivotPct?: number; contraction?: boolean; dryVolumeRatio?: number; trend?: boolean; ranges?: number[] };
  epsGrowth: number | null; salesGrowth: number | null; ipoDate: string | null; ipoSource: string | null;
  firstTradeDate: string | null; isIpo: boolean; earningsDate: string | null; sectorGood: boolean;
  blockers: string[]; plan: DeskPlan | null; reason: string;
}
export interface DeskMovement { id: string; date: string; symbol: string; from: string; to: string; reason: string }
export interface DeskReport {
  schemaVersion: number; generatedAt: string; session: string; nextSession: string; preview: boolean; complete: boolean;
  coverage: {sourceTotal: number; sourceReceived: number; common: number; liquid: number; validHistory: number; failedHistory: number; rsRanked: number};
  candidates: DeskCandidate[];
  prices: Record<string,{close: number; date: string}>;
  market: {favorable: boolean; benchmarks: {symbol: string; close?: number; return63?: number; valid: boolean}[]};
  email: {configured: boolean; lastAcceptedAt: string | null};
  monitorStatus: {checkedAt: string; checks: {symbol: string; status: string}[]} | null;
  days: {date: string; preview: boolean; complete: boolean; analyzed: number; buyAlert: number; watchlist: number; ipo: number; armed: number}[];
  movements: DeskMovement[];
  alerts: {id: string; symbol: string; observedAt: string; price: number; shares: number; emailStatus: string}[];
}
export interface TradeRecord {id: string; symbol: string; side: 'buy' | 'sell'; quantity: number; price: number; fees: number; at: string; note: string}
export interface Journal {version: 1; initialCapital: number; trades: TradeRecord[]}
export interface Position {symbol: string; quantity: number; cost: number; averagePrice: number; openedAt: string}
