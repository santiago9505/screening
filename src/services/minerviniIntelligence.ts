import { SetupState, Stock, StockSetupProfile } from '../types';

export type MarketRegimeState = 'GO' | 'CAUTIOUS' | 'DEFENSIVE' | 'WATCH ONLY';

export interface MarketPulseInput {
  total: number;
  advancers: number;
  breadth: number;
  trendQuality: number;
  leaders: number;
  averageChange: number;
}

export interface MarketRegime {
  state: MarketRegimeState;
  score: number;
  exposure: string;
  tone: 'positive' | 'warning' | 'negative' | 'neutral';
  rationale: string;
}

export interface CopilotCandidate {
  stock: Stock;
  score: number;
  reason: string;
}

export interface CopilotResult {
  label: string;
  summary: string;
  candidates: CopilotCandidate[];
  understood: string[];
}

const hasNumber = (value: unknown): value is number => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const number = (value: unknown): number => hasNumber(value) ? Number(value) : 0;
const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));
const unique = (values: string[]): string[] => [...new Set(values.filter(Boolean))];
const pct = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

const styleForState = (state: SetupState): StockSetupProfile['style'] => {
  if (state === 'Actionable') return { color: '#4de3b5', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', rowClass: '' };
  if (state === 'Close') return { color: '#f6c85f', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30', rowClass: '' };
  if (state === 'Watch') return { color: '#70a1ff', badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30', rowClass: '' };
  if (state === 'Uncovered') return { color: '#ad8cff', badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30', rowClass: '' };
  return { color: '#7f8b9d', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30', rowClass: '' };
};

const yearsSinceListing = (firstBarTime?: number | null): number | null => {
  if (!firstBarTime || firstBarTime <= 0) return null;
  const milliseconds = firstBarTime > 10_000_000_000 ? firstBarTime : firstBarTime * 1000;
  const years = (Date.now() - milliseconds) / (365.25 * 24 * 60 * 60 * 1000);
  return Number.isFinite(years) ? Math.max(0, years) : null;
};

export const evaluateMinerviniStock = (stock: Stock): StockSetupProfile => {
  const fundamentals = stock.fundamentals;
  const epsGrowth = hasNumber(fundamentals?.epsGrowth) ? Number(fundamentals?.epsGrowth) : null;
  const revenueGrowth = hasNumber(fundamentals?.revenueGrowth) ? Number(fundamentals?.revenueGrowth) : null;
  const operatingMargin = hasNumber(fundamentals?.operatingMargin) ? Number(fundamentals?.operatingMargin) : null;
  const netMargin = hasNumber(fundamentals?.netMargin) ? Number(fundamentals?.netMargin) : null;
  const high52 = number(stock.price52WeekHigh);
  const low52 = number(stock.price52WeekLow);
  const distanceFromHigh = high52 > 0 ? ((high52 - stock.price) / high52) * 100 : null;
  const distanceAboveLow = low52 > 0 ? ((stock.price - low52) / low52) * 100 : null;
  const extensionSma20 = stock.sma20 > 0 ? ((stock.price - stock.sma20) / stock.sma20) * 100 : null;
  const listingYears = yearsSinceListing(stock.firstBarTime);
  const averageVolume = number(stock.averageVolume30d) || number(stock.volume);
  const dollarVolume = number(stock.dollarVolume) || stock.price * averageVolume;
  const rvol = number(stock.relativeVolume10d);

  const above50 = stock.sma50 > 0 && stock.price > stock.sma50;
  const above150 = stock.sma150 > 0 && stock.price > stock.sma150;
  const above200 = stock.sma200 > 0 && stock.price > stock.sma200;
  const sma50Above150 = stock.sma50 > 0 && stock.sma150 > 0 && stock.sma50 > stock.sma150;
  const sma50Above200 = stock.sma50 > 0 && stock.sma200 > 0 && stock.sma50 > stock.sma200;
  const sma150Above200 = stock.sma150 > 0 && stock.sma200 > 0 && stock.sma150 > stock.sma200;
  const stage2 = above50 && above150 && above200 && sma50Above150 && sma50Above200 && sma150Above200;
  const trendTemplate = stage2 && (distanceAboveLow === null || distanceAboveLow >= 25) && (distanceFromHigh === null || distanceFromHigh <= 25);
  const nonExtended = extensionSma20 === null || extensionSma20 <= 12;
  const quotePass = stock.quoteStatus !== 'unavailable' && stock.price > 0;
  const pricePass = stock.price >= 10;
  const rsPass = stock.relativeStrength >= 70;
  const hasFundamentals = Boolean(fundamentals?.hasFundamentals && (epsGrowth !== null || revenueGrowth !== null));
  const hasQuarterlyDepth = number(fundamentals?.quarterlyPoints) >= 4;

  let universeScore = 0;
  if (pricePass) universeScore += 4;
  if (quotePass) universeScore += 2;
  if (averageVolume >= 200_000) universeScore += 2;
  if (dollarVolume >= 10_000_000) universeScore += 2;

  let fundamentalsScore = 0;
  if (hasFundamentals) fundamentalsScore += 3;
  if (epsGrowth !== null) fundamentalsScore += epsGrowth >= 40 ? 8 : epsGrowth >= 25 ? 6 : epsGrowth >= 20 ? 5 : epsGrowth > 0 ? 2 : 0;
  if (revenueGrowth !== null) fundamentalsScore += revenueGrowth >= 40 ? 6 : revenueGrowth >= 25 ? 5 : revenueGrowth >= 20 ? 4 : revenueGrowth > 0 ? 2 : 0;
  if (operatingMargin !== null && operatingMargin > 0) fundamentalsScore += 2;
  if (netMargin !== null && netMargin > 0) fundamentalsScore += 2;
  if (fundamentals?.epsAcceleration === true) fundamentalsScore += 1;
  if (fundamentals?.revenueAcceleration === true) fundamentalsScore += 1;
  if (epsGrowth !== null && epsGrowth > 0) fundamentalsScore += 1;
  if (revenueGrowth !== null && revenueGrowth > 0) fundamentalsScore += 1;
  fundamentalsScore = clamp(fundamentalsScore, 0, 25);

  let trendScore = 0;
  if (above50) trendScore += 3;
  if (above150) trendScore += 3;
  if (above200) trendScore += 3;
  if (sma50Above150) trendScore += 3;
  if (sma150Above200) trendScore += 3;
  if (distanceAboveLow !== null && distanceAboveLow >= 25) trendScore += 2;
  if (distanceFromHigh !== null && distanceFromHigh <= 25) trendScore += 2;
  if (stock.sma20 > 0 && stock.price > stock.sma20) trendScore += 1;

  let leadershipScore = stock.relativeStrength >= 90 ? 8 : stock.relativeStrength >= 80 ? 6 : stock.relativeStrength >= 70 ? 4 : stock.relativeStrength >= 50 ? 2 : 0;
  if (number(stock.perf3M) > 0) leadershipScore += 3;
  if (number(stock.perf6M) > 0) leadershipScore += 2;
  if (distanceFromHigh !== null && distanceFromHigh <= 10) leadershipScore += 2;
  leadershipScore = clamp(leadershipScore, 0, 15);

  let setupScore = 0;
  if (distanceFromHigh !== null) setupScore += distanceFromHigh <= 5 ? 4 : distanceFromHigh <= 10 ? 3 : distanceFromHigh <= 15 ? 2 : 0;
  if (extensionSma20 !== null) setupScore += extensionSma20 >= -2 && extensionSma20 <= 5 ? 4 : extensionSma20 <= 12 ? 2 : 0;
  if (rvol >= 0.35 && rvol <= 1.05) setupScore += 2;
  else if (rvol >= 1.3) setupScore += 1;
  if (stage2) setupScore += 3;
  if (number(stock.perf1M) > 0) setupScore += 2;
  setupScore = clamp(setupScore, 0, 15);

  let actionabilityScore = 0;
  if (trendTemplate) actionabilityScore += 5;
  if (rsPass) actionabilityScore += 3;
  if (epsGrowth !== null && revenueGrowth !== null && epsGrowth >= 20 && revenueGrowth >= 20) actionabilityScore += 3;
  if (averageVolume >= 200_000 && dollarVolume >= 10_000_000) actionabilityScore += 2;
  if (nonExtended) actionabilityScore += 2;

  const score = Math.round(universeScore + fundamentalsScore + trendScore + leadershipScore + setupScore + actionabilityScore);
  const hardPass = quotePass && pricePass && trendTemplate && rsPass;
  const extendedAboveHigh = high52 > 0 && stock.price > high52 * 1.02;
  const extended = !nonExtended || extendedAboveHigh;
  const coverageGaps: string[] = [];
  if (!hasFundamentals) coverageGaps.push('Fundamentales sin cobertura suficiente');
  else if (!hasQuarterlyDepth) coverageGaps.push('Snapshot TTM disponible; aceleración trimestral pendiente de validar');
  if (high52 <= 0 || low52 <= 0) coverageGaps.push('Rango de 52 semanas incompleto');
  if (!(stock.sma50 > 0 && stock.sma150 > 0 && stock.sma200 > 0)) coverageGaps.push('Medias de tendencia incompletas');
  if (!hasNumber(stock.perf3M) || !hasNumber(stock.perf6M)) coverageGaps.push('Historial de momentum incompleto');

  let state: SetupState;
  if (!quotePass || score < 65) state = 'Reject';
  else if (score >= 85 && hardPass && hasFundamentals && !extended) state = 'Actionable';
  else if (score >= 75 && hardPass && !extended) state = 'Close';
  else if (score >= 65) state = hasFundamentals ? 'Watch' : 'Uncovered';
  else state = 'Reject';

  const powerPlayProxy = trendTemplate && stock.relativeStrength >= 85 && (number(stock.perf1M) >= 50 || number(stock.perf3M) >= 100) && (distanceFromHigh ?? 100) <= 15;
  const primaryBaseProxy = trendTemplate && listingYears !== null && listingYears <= 4 && stock.relativeStrength >= 85 && (distanceFromHigh ?? 100) <= 15;
  const vcpProxy = trendTemplate && stock.relativeStrength >= 80 && (distanceFromHigh ?? 100) <= 10 && nonExtended && rvol >= 0.35 && rvol <= 1.05;
  const breakoutRadar = trendTemplate && (distanceFromHigh ?? 100) <= 2 && rvol >= 1.2;
  const lowCheatProxy = trendTemplate && (distanceFromHigh ?? 100) > 2 && (distanceFromHigh ?? 100) <= 12 && extensionSma20 !== null && extensionSma20 >= -1 && extensionSma20 <= 5;

  let type = 'Sin estructura confirmada';
  if (powerPlayProxy) type = 'Power Play radar';
  else if (primaryBaseProxy) type = 'Primary Base radar';
  else if (vcpProxy) type = 'VCP radar';
  else if (breakoutRadar) type = 'Breakout radar';
  else if (lowCheatProxy) type = 'Low Cheat radar';
  else if (trendTemplate) type = 'Trend Template';
  else if (above200) type = 'Stage 2 candidate';

  const autoTags: string[] = [];
  if (trendTemplate) autoTags.push('trend-template');
  if (stock.relativeStrength >= 90) autoTags.push('rs-90+');
  else if (stock.relativeStrength >= 80) autoTags.push('rs-80+');
  if ((distanceFromHigh ?? 100) <= 10) autoTags.push('near-high');
  if (rvol >= 0.35 && rvol <= 1.05) autoTags.push('volume-dry-up-proxy');
  if (rvol >= 1.3) autoTags.push('volume-expansion');
  if (epsGrowth !== null && epsGrowth >= 20 && revenueGrowth !== null && revenueGrowth >= 20) autoTags.push('fundamental-confirmation');
  if (extended) autoTags.push('extended');
  if (powerPlayProxy) autoTags.push('power-play');
  if (primaryBaseProxy) autoTags.push('primary-base');
  if (vcpProxy) autoTags.push('vcp-proxy');

  const positives: string[] = [];
  const negatives: string[] = [];
  if (trendTemplate) positives.push('Trend Template completo'); else negatives.push('Trend Template todavía incompleto');
  if (stock.relativeStrength >= 90) positives.push(`RS ${Math.round(stock.relativeStrength)}: liderazgo élite`);
  else if (stock.relativeStrength >= 70) positives.push(`RS ${Math.round(stock.relativeStrength)}: liderazgo válido`);
  else negatives.push(`RS ${Math.round(stock.relativeStrength)} por debajo de 70`);
  if (epsGrowth !== null && epsGrowth >= 20) positives.push(`EPS YoY ${pct(epsGrowth)}`);
  else if (epsGrowth !== null) negatives.push(`EPS YoY ${pct(epsGrowth)} no confirma`);
  if (revenueGrowth !== null && revenueGrowth >= 20) positives.push(`Ventas YoY ${pct(revenueGrowth)}`);
  else if (revenueGrowth !== null) negatives.push(`Ventas YoY ${pct(revenueGrowth)} no confirman`);
  if (distanceFromHigh !== null && distanceFromHigh <= 10) positives.push(`A ${distanceFromHigh.toFixed(1)}% del máximo de 52 semanas`);
  if (extended) negatives.push('Precio extendido: no perseguir la ruptura');

  const reviewFlags: string[] = [];
  reviewFlags.push('Confirmar que la SMA 200 lleva al menos un mes ascendiendo');
  if (type.includes('radar')) reviewFlags.push('El setup es una preclasificación: validar contracciones, pivot y volumen en el gráfico');
  if (rvol <= 0) reviewFlags.push('Volumen relativo no disponible');
  if (!hasFundamentals) reviewFlags.push('Validar EPS, ventas y márgenes en los filings antes de decidir');
  else if (!hasQuarterlyDepth) reviewFlags.push('Confirmar los últimos 2–3 trimestres y sus fechas en los filings');

  const triggerReference = high52 > 0 ? high52 : null;
  const entryReference = triggerReference || stock.price;
  const structuralAnchors = [stock.sma20, stock.ema20, entryReference * 0.94].filter((value) => value > 0 && value < entryReference);
  const stopReference = structuralAnchors.length ? Math.max(...structuralAnchors) : null;
  const riskPct = stopReference ? ((entryReference - stopReference) / entryReference) * 100 : null;
  const distanceToTriggerPct = triggerReference ? ((triggerReference - stock.price) / stock.price) * 100 : null;
  const boundedRiskPct = riskPct !== null && riskPct > 0 ? Math.min(8, Math.max(3, riskPct)) : null;
  const suggestedPositionPct = boundedRiskPct ? Math.min(25, (1.25 / boundedRiskPct) * 100) : null;

  const dataChecks = [
    quotePass,
    stock.sma50 > 0 && stock.sma150 > 0 && stock.sma200 > 0,
    high52 > 0 && low52 > 0,
    stock.relativeStrength > 0,
    averageVolume > 0,
    hasFundamentals,
    hasQuarterlyDepth,
    epsGrowth !== null && revenueGrowth !== null,
    hasNumber(stock.perf3M) && hasNumber(stock.perf6M),
  ];
  const confidence = Math.round((dataChecks.filter(Boolean).length / dataChecks.length) * 100);
  const setupQuality: StockSetupProfile['setupQuality'] = score >= 90 && hardPass && !extended ? 'A' : score >= 80 && hardPass ? 'B' : score >= 65 ? 'C' : 'Review';
  const previous = stock.setupProfile;
  const manualTags = previous?.manualTags || [];

  return {
    ...previous,
    state,
    score,
    hardPass,
    type,
    tags: unique([...autoTags, ...manualTags]),
    autoTags,
    manualTags,
    style: styleForState(state),
    pattern: {
      ...previous?.pattern,
      yearsSinceListing: listingYears,
    },
    feedback: previous?.feedback,
    positives,
    negatives,
    reviewFlags,
    confidence,
    stage: stage2 ? 'Stage 2' : above200 ? 'Stage 2 candidate' : above150 ? 'Transition' : 'No confirmed trend',
    setupQuality,
    subscores: {
      universe: universeScore,
      fundamentals: fundamentalsScore,
      trend: trendScore,
      leadership: leadershipScore,
      setup: setupScore,
      actionability: actionabilityScore,
    },
    riskPlan: {
      triggerReference,
      stopReference,
      riskPct: boundedRiskPct,
      distanceToTriggerPct,
      rewardRiskTarget: 2,
      suggestedPositionPct,
      equityRiskPct: 1.25,
      extended,
    },
    rules: [
      { id: 'quote', label: 'Cotización válida', kind: 'hard', pass: quotePass, value: stock.price > 0 ? `$${stock.price.toFixed(2)}` : 'Sin precio' },
      { id: 'price', label: 'Precio mínimo $10', kind: 'hard', pass: pricePass, value: `$${stock.price.toFixed(2)}` },
      { id: 'trend-template', label: 'Trend Template', kind: 'hard', pass: trendTemplate, value: `${trendScore}/20` },
      { id: 'rs', label: 'RS mínimo 70', kind: 'hard', pass: rsPass, value: String(Math.round(stock.relativeStrength)) },
      { id: 'fundamentals', label: 'EPS y ventas confirman', kind: 'soft', pass: epsGrowth !== null && revenueGrowth !== null ? epsGrowth >= 20 && revenueGrowth >= 20 : null, value: `${epsGrowth === null ? '—' : pct(epsGrowth)} / ${revenueGrowth === null ? '—' : pct(revenueGrowth)}` },
      { id: 'extension', label: 'Entrada no extendida', kind: 'hard', pass: !extended, value: extensionSma20 === null ? '—' : `${extensionSma20.toFixed(1)}% vs SMA20` },
      { id: 'sma200-slope', label: 'SMA 200 ascendiendo', kind: 'review', pass: null, value: 'Revisión gráfica' },
    ],
    coverageGaps,
    metrics: {
      ...previous?.metrics,
      distanceFromHigh,
      distanceAboveLow,
      extensionSma20,
      averageVolume,
      dollarVolume,
      relativeVolume: rvol,
    },
  };
};

export const enrichMinerviniUniverse = (stocks: Stock[]): Stock[] => stocks.map((stock) => ({
  ...stock,
  setupProfile: evaluateMinerviniStock(stock),
}));

export const deriveMarketRegime = (pulse: MarketPulseInput): MarketRegime => {
  const trendComponent = pulse.trendQuality * 0.55;
  const breadthComponent = pulse.breadth * 0.3;
  const leadershipComponent = pulse.total > 0 ? Math.min(100, (pulse.leaders / pulse.total) * 500) * 0.15 : 0;
  const score = Math.round(clamp(trendComponent + breadthComponent + leadershipComponent));

  if (pulse.trendQuality >= 60 && pulse.breadth >= 50 && pulse.averageChange > -0.25) {
    return { state: 'GO', score, exposure: '50–100% progresivo', tone: 'positive', rationale: 'Amplitud y tendencias apoyan la búsqueda de líderes.' };
  }
  if (pulse.trendQuality >= 48 && pulse.breadth >= 42 && pulse.averageChange > -0.8) {
    return { state: 'CAUTIOUS', score, exposure: '25–50% selectivo', tone: 'warning', rationale: 'Hay oportunidades, pero la confirmación del mercado es incompleta.' };
  }
  if (pulse.trendQuality < 38 || pulse.breadth < 35 || pulse.averageChange <= -1) {
    return { state: 'DEFENSIVE', score, exposure: '0–25% / proteger capital', tone: 'negative', rationale: 'La distribución domina; reducir tamaño y exigir confirmación.' };
  }
  return { state: 'WATCH ONLY', score, exposure: 'Pilotos 0–12.5%', tone: 'neutral', rationale: 'Mercado mixto: construir la lista antes de aumentar exposición.' };
};

const normalize = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const thresholdNear = (text: string, words: string[]): number | null => {
  for (const word of words) {
    const pattern = new RegExp(`${word}[^0-9]{0,12}(\\d{1,3})`);
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
};

export const runMinerviniCopilot = (stocks: Stock[], query: string, limit = 12): CopilotResult => {
  const text = normalize(query.trim());
  const understood: string[] = [];
  const minRs = thresholdNear(text, ['rs', 'fuerza relativa']);
  const minEps = thresholdNear(text, ['eps', 'earnings', 'beneficio']);
  const minRevenue = thresholdNear(text, ['ventas', 'revenue', 'ingresos']);
  const minScore = thresholdNear(text, ['score', 'puntuacion']) ?? (text.includes('accionable') ? 85 : 65);
  const wantsVcp = text.includes('vcp') || text.includes('contraccion');
  const wantsPowerPlay = text.includes('power play') || text.includes('powerplay');
  const wantsPrimary = text.includes('primary') || text.includes('base primaria') || text.includes('primera base');
  const wantsNearHigh = text.includes('cerca') && (text.includes('maximo') || text.includes('high'));
  const wantsNotExtended = text.includes('no extend') || text.includes('riesgo') || text.includes('pivot');
  const wantsMargins = text.includes('margen');
  const wantsFundamentals = minEps !== null || minRevenue !== null || text.includes('fundamental') || wantsMargins;

  if (minRs !== null) understood.push(`RS ≥ ${minRs}`);
  if (minEps !== null) understood.push(`EPS YoY ≥ ${minEps}%`);
  if (minRevenue !== null) understood.push(`Ventas YoY ≥ ${minRevenue}%`);
  if (wantsVcp) understood.push('VCP radar');
  if (wantsPowerPlay) understood.push('Power Play radar');
  if (wantsPrimary) understood.push('Primary Base radar');
  if (wantsNearHigh) understood.push('Cerca de máximos');
  if (wantsNotExtended) understood.push('Entrada no extendida');
  if (wantsMargins) understood.push('Márgenes positivos');
  if (understood.length === 0) understood.push(`Calidad SEPA ≥ ${minScore}`);

  const evaluated = stocks.map((stock) => stock.setupProfile?.subscores ? stock : ({ ...stock, setupProfile: evaluateMinerviniStock(stock) }));
  const candidates = evaluated.filter((stock) => {
    const profile = stock.setupProfile;
    if (!profile || profile.score < minScore) return false;
    if (minRs !== null && stock.relativeStrength < minRs) return false;
    if (minEps !== null && (!hasNumber(stock.fundamentals?.epsGrowth) || number(stock.fundamentals?.epsGrowth) < minEps)) return false;
    if (minRevenue !== null && (!hasNumber(stock.fundamentals?.revenueGrowth) || number(stock.fundamentals?.revenueGrowth) < minRevenue)) return false;
    if (wantsVcp && !profile.type.toLowerCase().includes('vcp')) return false;
    if (wantsPowerPlay && !profile.type.toLowerCase().includes('power play')) return false;
    if (wantsPrimary && !profile.type.toLowerCase().includes('primary')) return false;
    if (wantsNearHigh && number(profile.metrics?.distanceFromHigh) > 10) return false;
    if (wantsNotExtended && profile.riskPlan?.extended) return false;
    if (wantsMargins && !(number(stock.fundamentals?.operatingMargin) > 0 && number(stock.fundamentals?.netMargin) > 0)) return false;
    if (wantsFundamentals && !stock.fundamentals?.hasFundamentals) return false;
    return true;
  }).sort((left, right) => {
    const scoreDelta = number(right.setupProfile?.score) - number(left.setupProfile?.score);
    return scoreDelta || right.relativeStrength - left.relativeStrength;
  }).slice(0, limit).map((stock) => ({
    stock,
    score: number(stock.setupProfile?.score),
    reason: [stock.setupProfile?.type, ...(stock.setupProfile?.positives || []).slice(0, 2)].filter(Boolean).join(' · '),
  }));

  const label = query.trim() || 'Radar SEPA';
  const summary = candidates.length
    ? `${candidates.length} líderes priorizados de ${stocks.length.toLocaleString('es-CO')} analizados. Cada resultado conserva sus reglas, cobertura y riesgo.`
    : `Ninguna acción cumple todas las condiciones dentro de este universo. Prueba relajando una sola regla.`;

  return { label, summary, candidates, understood };
};
