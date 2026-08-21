import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCANNER_URL = 'https://scanner.tradingview.com/america/scan';
const MARKET_LIMIT = 2800;
const COLUMNS = [
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
];

const INDEX_TICKERS = ['SP:SPX', 'DJ:DJI', 'NASDAQ:IXIC', 'RUSSELL:RUT', 'CBOE:VIX', 'TVC:US10Y'];

const scan = async (payload) => {
  const response = await fetch(SCANNER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Northstar-EOD-Snapshot/1.0',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`TradingView scanner responded ${response.status}`);
  const body = await response.json();
  return Array.isArray(body?.data) ? body.data : [];
};

const [rows, indexRows] = await Promise.all([
  scan({
    filter: [
      { left: 'type', operation: 'equal', right: 'stock' },
      { left: 'close', operation: 'greater', right: 1 },
      { left: 'volume', operation: 'greater', right: 50000 },
    ],
    options: { lang: 'es' },
    markets: ['america'],
    symbols: { query: { types: [] }, tickers: [] },
    columns: COLUMNS,
    sort: { sortBy: 'Value.Traded', sortOrder: 'desc' },
    range: [0, MARKET_LIMIT],
  }),
  scan({
    symbols: { tickers: INDEX_TICKERS, query: { types: [] } },
    columns: COLUMNS,
  }),
]);

if (rows.length < 100) throw new Error(`Snapshot rejected: only ${rows.length} equities returned`);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(currentDirectory, '..', 'public', 'data');
const outputPath = path.join(outputDirectory, 'market-snapshot.json');
const payload = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: 'TradingView Scanner EOD',
  columns: COLUMNS,
  count: rows.length,
  rows,
  indexRows,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, JSON.stringify(payload), 'utf8');
console.log(`[snapshot] ${rows.length} equities and ${indexRows.length} indices written to ${outputPath}`);
