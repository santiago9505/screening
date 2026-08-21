import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const entry = path.resolve('src/services/minerviniIntelligence.ts');
const bundle = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  write: false,
});
const source = bundle.outputFiles[0].text;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const {
  deriveMarketRegime,
  enrichMinerviniUniverse,
  evaluateMinerviniStock,
  runMinerviniCopilot,
} = await import(moduleUrl);

const stockFixture = (overrides = {}) => ({
  symbol: 'LEAD',
  name: 'SEPA Leader',
  price: 98,
  prevClose: 97,
  changePercent: 1.03,
  high: 99,
  low: 96,
  open: 97,
  volume: 1_200_000,
  averageVolume30d: 1_000_000,
  relativeVolume10d: 0.8,
  dollarVolume: 98_000_000,
  marketCap: 12_000_000_000,
  price52WeekHigh: 100,
  price52WeekLow: 50,
  sma20: 95,
  sma50: 88,
  sma150: 74,
  sma200: 68,
  ema20: 96,
  ema50: 87,
  perf1M: 12,
  perf3M: 34,
  perf6M: 62,
  perfY: 110,
  relativeStrength: 96,
  quoteStatus: 'ok',
  fundamentals: {
    symbol: 'LEAD',
    hasFundamentals: true,
    coverage: 'fresh',
    quarterlyPoints: 8,
    epsGrowth: 55,
    revenueGrowth: 35,
    grossMargin: 48,
    operatingMargin: 18,
    netMargin: 14,
    epsAcceleration: true,
    revenueAcceleration: true,
  },
  lastUpdate: new Date().toISOString(),
  ...overrides,
});

test('clasifica un líder completo como Actionable con score de 100 puntos', () => {
  const profile = evaluateMinerviniStock(stockFixture());
  assert.equal(profile.state, 'Actionable');
  assert.equal(profile.hardPass, true);
  assert.ok(profile.score >= 85 && profile.score <= 100);
  assert.equal(Object.values(profile.subscores).reduce((sum, value) => sum + value, 0), profile.score);
  assert.ok(profile.riskPlan.riskPct >= 3 && profile.riskPlan.riskPct <= 8);
  assert.ok(profile.riskPlan.suggestedPositionPct <= 25);
});

test('una acción extendida no se vuelve accionable aunque su calidad sea alta', () => {
  const profile = evaluateMinerviniStock(stockFixture({ price: 120, high: 121, low: 118 }));
  assert.equal(profile.riskPlan.extended, true);
  assert.notEqual(profile.state, 'Actionable');
  assert.ok(profile.tags.includes('extended'));
});

test('la falta de fundamentales se separa como gap de cobertura', () => {
  const profile = evaluateMinerviniStock(stockFixture({ fundamentals: undefined }));
  assert.ok(profile.coverageGaps.some((gap) => gap.includes('Fundamentales')));
  assert.notEqual(profile.state, 'Actionable');
  assert.ok(profile.confidence < 100);
});

test('el copiloto interpreta umbrales en español y ordena la shortlist', () => {
  const stocks = enrichMinerviniUniverse([
    stockFixture(),
    stockFixture({ symbol: 'WEAK', relativeStrength: 72, fundamentals: { ...stockFixture().fundamentals, epsGrowth: 8, revenueGrowth: 5 } }),
  ]);
  const result = runMinerviniCopilot(stocks, 'RS 90, EPS 25 y ventas 25, no extendidas');
  assert.deepEqual(result.candidates.map((candidate) => candidate.stock.symbol), ['LEAD']);
  assert.ok(result.understood.includes('RS ≥ 90'));
  assert.ok(result.understood.includes('Ventas YoY ≥ 25%'));
});

test('el régimen distingue GO de DEFENSIVE', () => {
  const go = deriveMarketRegime({ total: 100, advancers: 62, breadth: 62, trendQuality: 68, leaders: 18, averageChange: 0.7 });
  const defensive = deriveMarketRegime({ total: 100, advancers: 22, breadth: 22, trendQuality: 28, leaders: 4, averageChange: -1.8 });
  assert.equal(go.state, 'GO');
  assert.equal(defensive.state, 'DEFENSIVE');
});

test('evalúa y consulta un universo de 2.800 acciones en tiempo interactivo', () => {
  const universe = Array.from({ length: 2_800 }, (_, index) => stockFixture({
    symbol: `S${String(index).padStart(4, '0')}`,
    relativeStrength: 70 + (index % 29),
  }));
  const startedAt = performance.now();
  const enriched = enrichMinerviniUniverse(universe);
  const result = runMinerviniCopilot(enriched, 'score 80 rs 90 no extendida');
  const elapsed = performance.now() - startedAt;

  assert.equal(enriched.length, 2_800);
  assert.ok(result.candidates.length > 0);
  assert.ok(elapsed < 1_500, `el motor tardó ${elapsed.toFixed(1)}ms`);
});

test('el módulo se empaqueta desde su ruta real', () => {
  assert.ok(pathToFileURL(entry).href.endsWith('minerviniIntelligence.ts'));
});
