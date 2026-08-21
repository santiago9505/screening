import express from 'express';

import cors from 'cors';

import axios from 'axios';

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  calculateRSRatings as calculatePreciseRSRatings,
  calculateRSScoreFromPerformance as calculatePreciseRSScoreFromPerformance
} from './lib/rs-rating.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnvFromFile() {
  const envPath = join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) return;
    process.env[key] = value;
  });
}

loadEnvFromFile();


const app = express();

const PORT = Number(process.env.PORT || 3002);


// Middleware

app.use(cors());
app.use(express.json());

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';


// Cargar lista completa de acciones de EEUU

let ALL_US_STOCKS = [];

let ALL_US_SYMBOLS = [];

const STOCK_INFO_MAP = {};



// Función para validar símbolos (excluir símbolos con caracteres especiales inválidos)

function isValidSymbol(symbol) {

  if (!symbol || typeof symbol !== 'string') return false;



  // Excluir símbolos con caracteres especiales que no funcionan con Yahoo Finance

  // $ indica clases de acciones preferentes que no tienen datos

  // Símbolos muy largos o con caracteres extraños también son problemáticos

  const invalidPatterns = [

    /\$/,           // Dólar (preferred shares sin datos)

    /\s/,           // Espacios

    /[<>]/,         // Símbolos inválidos

    /^\d+$/,        // Solo números

  ];



  // Verificar si el símbolo contiene algún patrón inválido

  for (const pattern of invalidPatterns) {

    if (pattern.test(symbol)) return false;

  }



  // Mantener símbolos válidos: letras, puntos, guiones, y ^ para índices

  return /^[A-Za-z0-9\.\-\^]+$/.test(symbol);

}



try {

  const stocksData = fs.readFileSync('./all-us-stocks.json', 'utf8');

  const rawStocks = JSON.parse(stocksData);



  // Filtrar solo símbolos válidos Y que no sean ETFs

  const validStocks = rawStocks.filter(s => isValidSymbol(s.symbol));



  // Separar acciones reales de ETFs

  const onlyStocks = validStocks.filter(s => !s.isETF);

  const onlyETFs = validStocks.filter(s => s.isETF);



  // Para "Todas", usar solo acciones (sin ETFs)

  ALL_US_STOCKS = onlyStocks;

  ALL_US_SYMBOLS = onlyStocks.map(s => s.symbol);

  onlyStocks.forEach(stock => {

    STOCK_INFO_MAP[stock.symbol] = stock;

  });



  const filteredCount = rawStocks.length - validStocks.length;

  console.log(`[data] Cargadas ${ALL_US_STOCKS.length} acciones reales del mercado de EEUU`);
  console.log(`   Acciones: ${ALL_US_STOCKS.length}`);
  console.log(`   ETFs excluidos: ${onlyETFs.length}`);
  console.log(`   Símbolos inválidos filtrados: ${filteredCount}`);
} catch (error) {

  console.warn('[warning] No se encontró all-us-stocks.json, usando lista reducida');
}



const EXCHANGE_CODE_MAP = {

  'A': 'AMEX',

  'B': 'NYSE',

  'C': 'NYSE',

  'N': 'NYSE',

  'P': 'NYSEARCA',

  'Q': 'NASDAQ',

  'Z': 'BATS',

  'I': 'NYSEARCA',

  'M': 'NASDAQ',

  'V': 'IEX',

  'U': 'NASDAQ',

  '': 'NASDAQ'

};



const INDEX_TICKER_MAP = {

  '^GSPC': 'SP:SPX',

  '^DJI': 'DJ:DJI',

  '^IXIC': 'NASDAQ:IXIC',

  '^RUT': 'RUSSELL:RUT',

  '^VIX': 'CBOE:VIX',

  '^TNX': 'TVC:US10Y'

};



const tradingViewCache = {

  data: {},

  timestamps: {}

};



const TV_CACHE_DURATION = 60 * 1000; // 60 segundos



const TV_COLUMNS = [
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
  // Columnas para calcular RS Rating (performance histórico)
  'Perf.3M',      // Performance últimos 3 meses
  'Perf.6M',      // Performance últimos 6 meses
  'Perf.Y',       // Performance último año (12 meses)
  'change_from_open|1M',  // Cambio desde hace 1 mes

];



function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function mapTradingViewRow(rowValues = []) {
  const mapped = {};
  TV_COLUMNS.forEach((column, index) => {
    mapped[column] = rowValues[index];
  });
  return mapped;
}


function getExchangePrefix(symbol) {

  const info = STOCK_INFO_MAP[symbol];

  if (!info) {

    return 'NASDAQ';

  }

  const code = (info.exchange || '').trim();

  return EXCHANGE_CODE_MAP[code] || 'NASDAQ';

}



function toTradingViewTicker(symbol) {

  if (!symbol) return null;



  // índices especiales

  if (symbol.startsWith('^')) {

    return INDEX_TICKER_MAP[symbol] || null;

  }



  // Cripto

  if (symbol.includes('-USD')) {

    return `BINANCE:${symbol.replace('-', '')}`;

  }



  // Símbolos ya con prefijo

  if (symbol.includes(':')) {

    return symbol;

  }



  const exchange = getExchangePrefix(symbol);

  return `${exchange}:${symbol}`;

}



async function fetchTradingViewBatch(symbols = []) {
  const results = {};
  const chunkSize = 50;


  for (let i = 0; i < symbols.length; i += chunkSize) {

    const batchSymbols = symbols.slice(i, i + chunkSize);

    const tickerMap = {};

    const tvTickers = [];



    batchSymbols.forEach(sym => {

      const tvTicker = toTradingViewTicker(sym);

      if (tvTicker) {

        tvTickers.push(tvTicker);

        tickerMap[tvTicker] = sym;

      }

    });



    if (tvTickers.length === 0) {

      continue;

    }



    const payload = {

      symbols: {

        tickers: tvTickers,

        query: { types: [] }

      },

      columns: TV_COLUMNS

    };



    let attempt = 0;

    let completed = false;



    while (!completed && attempt < 3) { // Reducido de 5 a 3 intentos

      try {

        const response = await axios.post('https://scanner.tradingview.com/america/scan', payload, {

          headers: {

            'Content-Type': 'application/json',

            'User-Agent': 'Mozilla/5.0'

          },

          timeout: 10000 // Reducido de 12s a 10s

        });



        const rows = response.data?.data || [];
        rows.forEach(row => {
          const originalSymbol = tickerMap[row.s];
          if (!originalSymbol) return;

          const fields = mapTradingViewRow(row.d);
          const description = fields.description;
          const close = fields.close;
          const changePercent = fields.change;
          const changeAbs = fields.change_abs;
          const open = fields.open;
          const high = fields.high;
          const low = fields.low;
          const volume = fields.volume;
          const dollarVolume = fields['Value.Traded'];
          const averageVolume30d = fields.average_volume_30d_calc;
          const relativeVolume10d = fields.relative_volume_10d_calc;
          const marketCap = fields.market_cap_basic;
          const price52WeekHigh = fields.price_52_week_high;
          const price52WeekLow = fields.price_52_week_low;
          const firstBarTime = fields.first_bar_time;
          const floatShares = fields.float_shares_outstanding;
          const peRatio = fields.price_earnings_ttm;
          const sma20 = fields.SMA20;
          const sma50 = fields.SMA50;
          const sma100 = fields.SMA100;
          const sma150 = fields.SMA150;
          const sma200 = fields.SMA200;
          const ema20 = fields.EMA20;
          const ema50 = fields.EMA50;
          const perf1M = fields['Perf.1M'];
          const perf3M = fields['Perf.3M'];
          const perf6M = fields['Perf.6M'];
          const perfY = fields['Perf.Y'];
          const changeFrom1M = fields['change_from_open|1M'];
          const prevClose = (() => {
            if (typeof changeAbs === 'number' && !Number.isNaN(changeAbs)) {
              return close - changeAbs;
            }
            if (typeof changePercent === 'number' && changePercent !== 0) {
              return close / (1 + changePercent / 100);

            }

            return close;

          })();



          // Calcular RS Score usando datos de performance histórico

          const rsData = calculatePreciseRSScoreFromPerformance({
            perf1M,
            perf3M,
            perf6M,
            perfY,
            changeFrom1M
          });


          results[originalSymbol] = {
            symbol: originalSymbol,
            name: description || getStockName(originalSymbol),
            sector: fields.sector || null,
            industry: fields.industry || null,
            price: Number(close) || 0,
            prevClose: Number(prevClose) || 0,
            changePercent: Number(changePercent) || 0,
            high: Number(high) || Number(close) || 0,
            low: Number(low) || Number(close) || 0,
            open: Number(open) || Number(close) || 0,
            volume: Number(volume) || 0,
            dollarVolume: Number(dollarVolume) || 0,
            averageVolume30d: Number(averageVolume30d) || 0,
            relativeVolume10d: Number(relativeVolume10d) || 0,
            marketCap: Number(marketCap) || 0,
            price52WeekHigh: Number(price52WeekHigh) || 0,
            price52WeekLow: Number(price52WeekLow) || 0,
            firstBarTime: Number(firstBarTime) || null,
            floatShares: Number(floatShares) || 0,
            peRatio: Number(peRatio) || 0,
            sma20: Number(sma20) || 0,
            sma50: Number(sma50) || 0,
            sma100: Number(sma100) || 0,
            sma150: Number(sma150) || ((Number(sma50) > 0 && Number(sma200) > 0) ? ((Number(sma50) + Number(sma200)) / 2) : 0),
            sma200: Number(sma200) || 0,
            ema20: Number(ema20) || 0,
            ema50: Number(ema50) || 0,
            perf1M: Number(perf1M) || 0,
            perf3M: Number(perf3M) || 0,
            perf6M: Number(perf6M) || 0,
            perfY: Number(perfY) || 0,
            relativeStrength: rsData.tempRS, // RS provisional hasta recalcular percentiles
            rsScore: rsData.score,            // RS Score bruto para ranking posterior
            rsQuarters: rsData.quarters,      // Datos de cada trimestre
            lastUpdate: new Date().toISOString(),
            source: 'TradingView'
          };

        });



        completed = true;

      } catch (error) {

        attempt += 1;

        const status = error.response?.status;

        if (status === 429 || status === 502 || status === 520) {

          const waitMs = 500 * attempt; // Reducido de 1000ms a 500ms

          console.warn(`[warning] TradingView rate limit (${status}) en lote ${i / chunkSize + 1}. Reintentando en ${waitMs} ms...`);
          await delay(waitMs);

        } else {

          console.error(`[error] Error obteniendo datos de TradingView: ${error.message}`);
          completed = true;

        }

      }

    }



    // Pausa breve entre batches para evitar rate limits

    if (i + chunkSize < symbols.length) {

      await delay(200);

    }

  }


  return results;
}

function createUnavailableQuoteStock(symbol) {
  const stockInfo = STOCK_INFO_MAP[symbol];
  const name = stockInfo && stockInfo.name
    ? stockInfo.name
    : getStockName(symbol);

  return {
    symbol,
    name: name || symbol,
    price: 0,
    prevClose: 0,
    changePercent: 0,
    high: 0,
    low: 0,
    open: 0,
    volume: 0,
    marketCap: 0,
    dollarVolume: 0,
    averageVolume30d: 0,
    relativeVolume10d: 0,
    price52WeekHigh: 0,
    price52WeekLow: 0,
    firstBarTime: null,
    floatShares: 0,
    peRatio: 0,
    sma20: 0,
    sma50: 0,
    sma100: 0,
    sma150: 0,
    sma200: 0,
    ema20: 0,
    ema50: 0,
    perf1M: 0,
    perf3M: 0,
    perf6M: 0,
    perfY: 0,
    relativeStrength: 0,
    rsScore: null,
    rsQuarters: { q1: null, q2: null, q3: null, q4: null },
    lastUpdate: new Date().toISOString(),
    source: 'TradingView',
    quoteStatus: 'unavailable'
  };
}

async function getTradingViewData(symbols = [], { forceRefresh = false } = {}) {
  const now = Date.now();
  const uniqueSymbols = Array.from(new Set(symbols));
  const pending = [];
  const dataMap = {};


  uniqueSymbols.forEach(symbol => {

    if (!forceRefresh && tradingViewCache.data[symbol] && (now - tradingViewCache.timestamps[symbol]) < TV_CACHE_DURATION) {

      dataMap[symbol] = tradingViewCache.data[symbol];

    } else {

      pending.push(symbol);

    }

  });



  if (pending.length > 0) {
    const fetched = await fetchTradingViewBatch(pending);
    Object.entries(fetched).forEach(([symbol, stock]) => {
      tradingViewCache.data[symbol] = stock;
      tradingViewCache.timestamps[symbol] = now;
      dataMap[symbol] = stock;
    });

    const missingSymbols = pending.filter((symbol) => !dataMap[symbol]);
    if (missingSymbols.length > 0) {
      console.warn(`⚠️ TradingView no devolvio quote para ${missingSymbols.length} simbolos. Se incluyen como placeholder.`);
      missingSymbols.forEach((symbol) => {
        const placeholder = createUnavailableQuoteStock(symbol);
        tradingViewCache.data[symbol] = placeholder;
        tradingViewCache.timestamps[symbol] = now;
        dataMap[symbol] = placeholder;
      });
    }
  }

  return symbols
    .map(symbol => dataMap[symbol])
    .filter(Boolean);
}



// Lista completa de acciones del S&P 500 (top 100 más líquidas)

const SP500_STOCKS = [

  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH', 'XOM',

  'JPM', 'JNJ', 'V', 'PG', 'MA', 'HD', 'CVX', 'ABBV', 'MRK', 'LLY',

  'AVGO', 'KO', 'PEP', 'COST', 'ADBE', 'MCD', 'TMO', 'WMT', 'CSCO', 'ABT',

  'ACN', 'CRM', 'NFLX', 'NKE', 'DHR', 'VZ', 'TXN', 'LIN', 'ORCL', 'NEE',

  'DIS', 'UPS', 'BMY', 'PM', 'RTX', 'QCOM', 'INTC', 'AMD', 'INTU', 'HON',

  'T', 'CMCSA', 'BA', 'UNP', 'LOW', 'COP', 'AMGN', 'SPGI', 'ELV', 'CAT',

  'DE', 'GE', 'AXP', 'PLD', 'BLK', 'MS', 'MDLZ', 'GILD', 'BKNG', 'SYK',

  'ADP', 'MMC', 'TJX', 'VRTX', 'C', 'ADI', 'ISRG', 'NOW', 'CB', 'REGN',

  'ZTS', 'MO', 'SCHW', 'PGR', 'CI', 'SO', 'DUK', 'BSX', 'EOG', 'ETN',

  'WM', 'CME', 'ITW', 'APD', 'MMM', 'CSX', 'PNC', 'ICE', 'GD', 'USB'

];



// Acciones adicionales populares (tech, growth, etc.)

const ADDITIONAL_STOCKS = [

  'SHOP', 'SQ', 'PYPL', 'ROKU', 'SNAP', 'UBER', 'LYFT', 'COIN', 'RBLX', 'ABNB',

  'PLTR', 'SNOW', 'DDOG', 'CRWD', 'ZS', 'OKTA', 'NET', 'MDB', 'TEAM', 'WDAY',

  'PANW', 'FTNT', 'SPLK', 'VEEV', 'ZM', 'DOCU', 'TWLO', 'DKNG', 'PENN', 'MGM',

  'F', 'GM', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI', 'PLUG', 'FCEL', 'BLNK',

  'ENPH', 'SEDG', 'RUN', 'SPWR', 'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC'

];



// índices y ETFs más importantes (solo los esenciales)

const MARKET_INDICES = [

  // índices principales

  '^GSPC',  // S&P 500 Index

  '^DJI',   // Dow Jones Industrial Average

  '^IXIC',  // NASDAQ Composite

  '^RUT',   // Russell 2000

  '^VIX',   // Volatility Index



  // ETFs más populares

  'SPY',    // SPDR S&P 500 ETF (el más líquido)

  'QQQ',    // Invesco QQQ Trust (NASDAQ-100)

  'VOO',    // Vanguard S&P 500 ETF



  // Sectoriales top

  'XLE',    // Energy Sector

  'XLF',    // Financial Sector

  'XLK',    // Technology Sector



  // Bitcoin

  'IBIT',   // iShares Bitcoin Trust



  // Commodities

  'GLD',    // SPDR Gold Trust

  'BTC-USD',// Bitcoin

];



// Combinar todas las acciones

const ALL_STOCKS = [...SP500_STOCKS, ...ADDITIONAL_STOCKS];

const STOCK_SYMBOLS = ALL_US_SYMBOLS.length > 0 ? ALL_US_SYMBOLS : SP500_STOCKS;


// Cache para RS Ratings calculados

let rsRatingCache = {

  data: {}, // { symbol: { rating: 85, score: 0.234, timestamp: Date } }

  lastCalculation: null,

  isCalculating: false

};



const RS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

const fundamentalsCache = {
  data: {}, // { symbol: { symbol, schemaVersion, quarterlyData } }
  timestamps: {},
  lastFullSyncAt: null
};
const FUNDAMENTALS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
const FUNDAMENTALS_SCHEMA_VERSION = 2;
const FUNDAMENTALS_CACHE_DIR = join(__dirname, '.cache');
const FUNDAMENTALS_CACHE_FILE = join(FUNDAMENTALS_CACHE_DIR, 'fundamentals-cache.json');
const FUNDAMENTALS_PERSIST_DEBOUNCE_MS = 1500;
const FINNHUB_MIN_INTERVAL_MS = Number(process.env.FUNDAMENTALS_REQUEST_INTERVAL_MS || 1200);
const FUNDAMENTALS_SYNC_INTERVAL = 24 * 60 * 60 * 1000;
const MINERVINI_CONFIG_DIR = join(__dirname, 'config');
const MINERVINI_CONFIG_FILE = join(MINERVINI_CONFIG_DIR, 'minervini-v1.json');
const SNAPSHOT_CACHE_DURATION = 15 * 60 * 1000;
const SETUP_FEEDBACK_FILE = join(FUNDAMENTALS_CACHE_DIR, 'setup-feedback.json');
const SETUP_SNAPSHOTS_FILE = join(FUNDAMENTALS_CACHE_DIR, 'setup-snapshots.json');
const SETUP_SNAPSHOT_RETENTION_DAYS = 420;
const SETUP_PERSIST_DEBOUNCE_MS = 1500;

const fundamentalsSyncState = {
  isRunning: false,
  queue: [],
  queuedSet: new Set(),
  processed: 0,
  succeeded: 0,
  failed: 0,
  missing: 0,
  totalPlanned: 0,
  startedAt: null,
  finishedAt: null,
  currentSymbol: null,
  lastError: null
};

let fundamentalsPersistTimer = null;
let setupFeedbackPersistTimer = null;
let setupSnapshotsPersistTimer = null;
const setupFeedbackStore = {
  entries: []
};
const setupSnapshotsStore = {
  byDate: {}
};
let finnhubRequestChain = Promise.resolve();
const fundamentalsInflight = new Map();
const universeSnapshotCache = {
  data: null,
  timestamp: 0,
  inflight: null,
  token: 0
};

function ensureFundamentalsCacheDir() {
  if (!fs.existsSync(FUNDAMENTALS_CACHE_DIR)) {
    fs.mkdirSync(FUNDAMENTALS_CACHE_DIR, { recursive: true });
  }
}

function loadFundamentalsCacheFromDisk() {
  try {
    if (!fs.existsSync(FUNDAMENTALS_CACHE_FILE)) {
      return;
    }

    const raw = fs.readFileSync(FUNDAMENTALS_CACHE_FILE, 'utf8');
    if (!raw) return;

    const parsed = JSON.parse(raw);
    fundamentalsCache.data = parsed && parsed.data && typeof parsed.data === 'object'
      ? parsed.data
      : {};
    fundamentalsCache.timestamps = parsed && parsed.timestamps && typeof parsed.timestamps === 'object'
      ? parsed.timestamps
      : {};
    fundamentalsCache.lastFullSyncAt = parsed && parsed.lastFullSyncAt
      ? parsed.lastFullSyncAt
      : null;

    console.log(`📚 Fundamentales cacheados cargados: ${Object.keys(fundamentalsCache.data).length} simbolos`);
  } catch (error) {
    console.warn('⚠️ No se pudo cargar el cache persistente de fundamentales:', error.message);
  }
}

function persistFundamentalsCacheToDisk() {
  try {
    ensureFundamentalsCacheDir();
    const payload = {
      data: fundamentalsCache.data,
      timestamps: fundamentalsCache.timestamps,
      lastFullSyncAt: fundamentalsCache.lastFullSyncAt,
      persistedAt: new Date().toISOString()
    };
    fs.writeFileSync(FUNDAMENTALS_CACHE_FILE, JSON.stringify(payload), 'utf8');
  } catch (error) {
    console.error('❌ Error persistiendo cache de fundamentales:', error.message);
  }
}

function scheduleFundamentalsCachePersist() {
  if (fundamentalsPersistTimer) {
    clearTimeout(fundamentalsPersistTimer);
  }

  fundamentalsPersistTimer = setTimeout(() => {
    fundamentalsPersistTimer = null;
    persistFundamentalsCacheToDisk();
  }, FUNDAMENTALS_PERSIST_DEBOUNCE_MS);
}

function getFundamentalsAgeMs(symbol) {
  const timestamp = fundamentalsCache.timestamps[symbol];
  if (!timestamp) return Infinity;
  return Date.now() - timestamp;
}

function getCachedFundamentalsPayload(symbol, { allowStale = false } = {}) {
  const payload = fundamentalsCache.data[symbol];
  if (!payload || payload.schemaVersion !== FUNDAMENTALS_SCHEMA_VERSION) {
    return null;
  }

  if (!allowStale && getFundamentalsAgeMs(symbol) > FUNDAMENTALS_CACHE_DURATION) {
    return null;
  }

  return payload;
}

function enqueueFinnhubRequest(task) {
  const next = finnhubRequestChain.then(async () => {
    const startedAt = Date.now();
    try {
      return await task();
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < FINNHUB_MIN_INTERVAL_MS) {
        await delay(FINNHUB_MIN_INTERVAL_MS - elapsed);
      }
    }
  });

  finnhubRequestChain = next.catch(() => {});
  return next;
}

function needsFundamentalsRefresh(symbol, { force = false } = {}) {
  if (force) return true;
  return !getCachedFundamentalsPayload(symbol, { allowStale: false });
}

function summarizeFundamentals(payload, symbol) {
  if (!payload || !Array.isArray(payload.quarterlyData) || payload.quarterlyData.length === 0) {
    return {
      symbol,
      hasFundamentals: false,
      coverage: 'missing',
      updatedAt: payload && payload.updatedAt ? payload.updatedAt : null,
      latestPeriodEnd: null,
      latestReportedDate: null,
      quarterlyPoints: 0,
      eps: null,
      epsGrowth: null,
      revenue: null,
      revenueGrowth: null,
      grossMargin: null,
      operatingMargin: null,
      netMargin: null,
      epsAcceleration: null,
      revenueAcceleration: null
    };
  }

  const ageMs = getFundamentalsAgeMs(symbol);
  const coverage = ageMs > FUNDAMENTALS_CACHE_DURATION ? 'stale' : 'fresh';
  const latest = payload.quarterlyData[payload.quarterlyData.length - 1];
  const previous = payload.quarterlyData[payload.quarterlyData.length - 2] || null;

  return {
    symbol,
    hasFundamentals: true,
    coverage,
    updatedAt: payload.updatedAt || null,
    latestPeriodEnd: latest.periodEnd || null,
    latestReportedDate: latest.reportedDate || null,
    quarterlyPoints: payload.quarterlyData.length,
    eps: Number.isFinite(latest.eps) ? latest.eps : null,
    epsGrowth: Number.isFinite(latest.epsGrowth) ? latest.epsGrowth : null,
    revenue: Number.isFinite(latest.revenue) ? latest.revenue : null,
    revenueGrowth: Number.isFinite(latest.revenueGrowth) ? latest.revenueGrowth : null,
    grossMargin: Number.isFinite(latest.grossMargin) ? latest.grossMargin : null,
    operatingMargin: Number.isFinite(latest.operatingMargin) ? latest.operatingMargin : null,
    netMargin: Number.isFinite(latest.netMargin) ? latest.netMargin : null,
    epsAcceleration: previous && Number.isFinite(previous.epsGrowth) && Number.isFinite(latest.epsGrowth)
      ? latest.epsGrowth > previous.epsGrowth
      : null,
    revenueAcceleration: previous && Number.isFinite(previous.revenueGrowth) && Number.isFinite(latest.revenueGrowth)
      ? latest.revenueGrowth > previous.revenueGrowth
      : null
  };
}

function addFundamentalsSummaryToStocks(stocks = []) {
  return stocks.map((stock) => {
    const cached = getCachedFundamentalsPayload(stock.symbol, { allowStale: true });
    return {
      ...stock,
      fundamentals: summarizeFundamentals(cached, stock.symbol)
    };
  });
}

function getUniverseSymbols() {
  if (Array.isArray(ALL_US_SYMBOLS) && ALL_US_SYMBOLS.length > 0) {
    return ALL_US_SYMBOLS;
  }

  return ALL_STOCKS
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && item.symbol) return String(item.symbol);
      return null;
    })
    .filter(Boolean);
}

async function fetchFundamentalsFromSource(symbol) {
  const response = await enqueueFinnhubRequest(() => axios.get(FINNHUB_BASE_URL + '/stock/financials-reported', {
    params: {
      symbol,
      freq: 'quarterly',
      token: FINNHUB_API_KEY
    },
    timeout: 20000
  }));

  if (response.data && response.data.error) {
    throw new Error(response.data.error);
  }

  const quarterlyData = parseQuarterlyFundamentals((response.data && response.data.data) || []);
  const payload = {
    symbol,
    source: 'finnhub',
    basis: 'calendar_end_date',
    schemaVersion: FUNDAMENTALS_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    quarterlyData,
    error: quarterlyData.length === 0 ? 'No quarterly fundamentals available for this symbol' : undefined
  };

  fundamentalsCache.data[symbol] = payload;
  fundamentalsCache.timestamps[symbol] = Date.now();
  scheduleFundamentalsCachePersist();
  return payload;
}

async function getOrFetchFundamentals(symbol, { forceRefresh = false, allowStale = false } = {}) {
  const cached = getCachedFundamentalsPayload(symbol, { allowStale });
  if (!forceRefresh && cached) {
    return cached;
  }

  if (!FINNHUB_API_KEY) {
    throw new Error('FINNHUB_API_KEY is not configured');
  }

  if (fundamentalsInflight.has(symbol)) {
    return fundamentalsInflight.get(symbol);
  }

  const request = fetchFundamentalsFromSource(symbol)
    .catch((error) => {
      if (error.response && error.response.status === 404) {
        const missingPayload = {
          symbol,
          source: 'finnhub',
          basis: 'calendar_end_date',
          schemaVersion: FUNDAMENTALS_SCHEMA_VERSION,
          updatedAt: new Date().toISOString(),
          quarterlyData: [],
          error: 'No quarterly fundamentals available for this symbol'
        };
        fundamentalsCache.data[symbol] = missingPayload;
        fundamentalsCache.timestamps[symbol] = Date.now();
        scheduleFundamentalsCachePersist();
        return missingPayload;
      }

      throw error;
    })
    .finally(() => {
      fundamentalsInflight.delete(symbol);
    });

  fundamentalsInflight.set(symbol, request);
  return request;
}

function queueFundamentalsSync(symbols = [], { force = false } = {}) {
  const startingFreshRun = !fundamentalsSyncState.isRunning && fundamentalsSyncState.queue.length === 0;
  let queued = 0;

  if (startingFreshRun) {
    fundamentalsSyncState.processed = 0;
    fundamentalsSyncState.succeeded = 0;
    fundamentalsSyncState.failed = 0;
    fundamentalsSyncState.missing = 0;
    fundamentalsSyncState.totalPlanned = 0;
    fundamentalsSyncState.startedAt = null;
    fundamentalsSyncState.finishedAt = null;
    fundamentalsSyncState.currentSymbol = null;
    fundamentalsSyncState.lastError = null;
  }

  symbols.forEach((rawSymbol) => {
    const symbol = String(rawSymbol || '').trim().toUpperCase();
    if (!symbol) return;
    if (!force && !needsFundamentalsRefresh(symbol)) return;
    if (fundamentalsSyncState.queuedSet.has(symbol)) return;

    fundamentalsSyncState.queue.push({ symbol, force });
    fundamentalsSyncState.queuedSet.add(symbol);
    queued += 1;
  });

  if (queued > 0) {
    fundamentalsSyncState.totalPlanned += queued;
    if (!fundamentalsSyncState.isRunning) {
      runFundamentalsSyncQueue().catch((error) => {
        console.error('❌ Error en sync de fundamentales:', error.message);
      });
    }
  }

  return queued;
}

async function runFundamentalsSyncQueue() {
  if (fundamentalsSyncState.isRunning) return;

  fundamentalsSyncState.isRunning = true;
  fundamentalsSyncState.startedAt = new Date().toISOString();
  fundamentalsSyncState.finishedAt = null;
  fundamentalsSyncState.lastError = null;

  console.log(`📘 Iniciando sync de fundamentales. Pendientes: ${fundamentalsSyncState.queue.length}`);

  while (fundamentalsSyncState.queue.length > 0) {
    const next = fundamentalsSyncState.queue.shift();
    if (!next) continue;

    const { symbol, force } = next;
    fundamentalsSyncState.queuedSet.delete(symbol);
    fundamentalsSyncState.currentSymbol = symbol;

    try {
      const payload = await getOrFetchFundamentals(symbol, {
        forceRefresh: force,
        allowStale: false
      });

      if (payload && Array.isArray(payload.quarterlyData) && payload.quarterlyData.length > 0) {
        fundamentalsSyncState.succeeded += 1;
      } else {
        fundamentalsSyncState.missing += 1;
      }
    } catch (error) {
      fundamentalsSyncState.failed += 1;
      fundamentalsSyncState.lastError = `${symbol}: ${error.message}`;
      console.warn(`⚠️ Error sincronizando fundamentales para ${symbol}: ${error.message}`);
    } finally {
      fundamentalsSyncState.processed += 1;
    }
  }

  fundamentalsSyncState.isRunning = false;
  fundamentalsSyncState.currentSymbol = null;
  fundamentalsSyncState.finishedAt = new Date().toISOString();
  fundamentalsCache.lastFullSyncAt = fundamentalsSyncState.finishedAt;
  scheduleFundamentalsCachePersist();

  console.log(`✅ Sync de fundamentales completado. OK: ${fundamentalsSyncState.succeeded}, missing: ${fundamentalsSyncState.missing}, failed: ${fundamentalsSyncState.failed}`);
}

function queueUniverseFundamentalsSync({ force = false, limit = null } = {}) {
  const universeSymbols = getUniverseSymbols();
  const staleSymbols = universeSymbols.filter((symbol) => needsFundamentalsRefresh(symbol, { force }));
  const symbolsToQueue = Number.isFinite(limit) && limit > 0
    ? staleSymbols.slice(0, limit)
    : staleSymbols;

  const queued = queueFundamentalsSync(symbolsToQueue, { force });
  console.log(`📗 Fundamentales pendientes en universo: ${staleSymbols.length}. Agregados a cola: ${queued}`);
  return {
    universeSize: universeSymbols.length,
    staleSymbols: staleSymbols.length,
    queued
  };
}

loadFundamentalsCacheFromDisk();
loadSetupFeedbackStoreFromDisk();
loadSetupSnapshotsFromDisk();

function normalizeTagId(value) {
  if (!value) return null;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || null;
}

function uniqueStrings(list = []) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

function getSnapshotDateKey(dateInput = null) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function normalizeFeedbackVerdict(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const allowed = new Set(['approved', 'maybe', 'reject', 'watch', 'skip']);
  if (allowed.has(normalized)) {
    return normalized;
  }

  return 'watch';
}

function parseFeedbackTags(tags) {
  if (!Array.isArray(tags)) return [];
  return uniqueStrings(tags.map((tag) => normalizeTagId(tag)).filter(Boolean)).slice(0, 25);
}

function ensureSetupFeedbackStoreShape() {
  if (!setupFeedbackStore || !Array.isArray(setupFeedbackStore.entries)) {
    setupFeedbackStore.entries = [];
  }
}

function ensureSetupSnapshotsStoreShape() {
  if (!setupSnapshotsStore || !setupSnapshotsStore.byDate || typeof setupSnapshotsStore.byDate !== 'object') {
    setupSnapshotsStore.byDate = {};
  }
}

function loadSetupFeedbackStoreFromDisk() {
  ensureSetupFeedbackStoreShape();
  try {
    if (!fs.existsSync(SETUP_FEEDBACK_FILE)) {
      return;
    }

    const raw = fs.readFileSync(SETUP_FEEDBACK_FILE, 'utf8');
    if (!raw.trim()) return;

    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed && parsed.entries) ? parsed.entries : [];

    setupFeedbackStore.entries = entries
      .map((item) => {
        const symbol = String((item && item.symbol) || '').trim().toUpperCase();
        const date = getSnapshotDateKey(item && item.date);
        if (!symbol) return null;

        return {
          symbol,
          date,
          verdict: normalizeFeedbackVerdict(item && item.verdict),
          tags: parseFeedbackTags(item && item.tags),
          notes: String((item && item.notes) || '').trim().slice(0, 2000),
          createdAt: item && item.createdAt ? String(item.createdAt) : new Date().toISOString(),
          updatedAt: item && item.updatedAt ? String(item.updatedAt) : new Date().toISOString()
        };
      })
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

    console.log(`Setup feedback loaded: ${setupFeedbackStore.entries.length} entries`);
  } catch (error) {
    console.warn('Could not load setup feedback store:', error.message);
  }
}

function persistSetupFeedbackStoreToDisk() {
  ensureSetupFeedbackStoreShape();
  try {
    ensureFundamentalsCacheDir();
    const payload = {
      entries: setupFeedbackStore.entries,
      persistedAt: new Date().toISOString()
    };
    fs.writeFileSync(SETUP_FEEDBACK_FILE, JSON.stringify(payload), 'utf8');
  } catch (error) {
    console.error('Error persisting setup feedback store:', error.message);
  }
}

function scheduleSetupFeedbackPersist() {
  if (setupFeedbackPersistTimer) {
    clearTimeout(setupFeedbackPersistTimer);
  }

  setupFeedbackPersistTimer = setTimeout(() => {
    setupFeedbackPersistTimer = null;
    persistSetupFeedbackStoreToDisk();
  }, SETUP_PERSIST_DEBOUNCE_MS);
}

function loadSetupSnapshotsFromDisk() {
  ensureSetupSnapshotsStoreShape();
  try {
    if (!fs.existsSync(SETUP_SNAPSHOTS_FILE)) {
      return;
    }

    const raw = fs.readFileSync(SETUP_SNAPSHOTS_FILE, 'utf8');
    if (!raw.trim()) return;

    const parsed = JSON.parse(raw);
    setupSnapshotsStore.byDate = parsed && parsed.byDate && typeof parsed.byDate === 'object'
      ? parsed.byDate
      : {};

    const days = Object.keys(setupSnapshotsStore.byDate);
    console.log(`Setup snapshots loaded: ${days.length} days`);
  } catch (error) {
    console.warn('Could not load setup snapshots store:', error.message);
  }
}

function persistSetupSnapshotsToDisk() {
  ensureSetupSnapshotsStoreShape();
  try {
    ensureFundamentalsCacheDir();
    const payload = {
      byDate: setupSnapshotsStore.byDate,
      persistedAt: new Date().toISOString()
    };
    fs.writeFileSync(SETUP_SNAPSHOTS_FILE, JSON.stringify(payload), 'utf8');
  } catch (error) {
    console.error('Error persisting setup snapshots store:', error.message);
  }
}

function scheduleSetupSnapshotsPersist() {
  if (setupSnapshotsPersistTimer) {
    clearTimeout(setupSnapshotsPersistTimer);
  }

  setupSnapshotsPersistTimer = setTimeout(() => {
    setupSnapshotsPersistTimer = null;
    persistSetupSnapshotsToDisk();
  }, SETUP_PERSIST_DEBOUNCE_MS);
}

function pruneSetupSnapshotsRetention() {
  ensureSetupSnapshotsStoreShape();
  const dayKeys = Object.keys(setupSnapshotsStore.byDate).sort();
  if (dayKeys.length <= SETUP_SNAPSHOT_RETENTION_DAYS) {
    return;
  }

  const removable = dayKeys.slice(0, dayKeys.length - SETUP_SNAPSHOT_RETENTION_DAYS);
  removable.forEach((dayKey) => {
    delete setupSnapshotsStore.byDate[dayKey];
  });
}

function getLatestSetupFeedbackBySymbol() {
  ensureSetupFeedbackStoreShape();
  const bySymbol = new Map();

  setupFeedbackStore.entries.forEach((entry) => {
    if (!entry || !entry.symbol) return;
    const existing = bySymbol.get(entry.symbol);
    if (!existing) {
      bySymbol.set(entry.symbol, entry);
      return;
    }

    const currentTime = new Date(entry.updatedAt || entry.createdAt || 0).getTime();
    const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
    if (!Number.isFinite(existingTime) || currentTime >= existingTime) {
      bySymbol.set(entry.symbol, entry);
    }
  });

  return bySymbol;
}

function upsertSetupFeedbackEntry(payload = {}) {
  ensureSetupFeedbackStoreShape();

  const symbol = String(payload.symbol || '').trim().toUpperCase();
  if (!symbol) {
    throw new Error('symbol is required');
  }

  const date = getSnapshotDateKey(payload.date);
  const verdict = normalizeFeedbackVerdict(payload.verdict);
  const tags = parseFeedbackTags(payload.tags);
  const notes = String(payload.notes || '').trim().slice(0, 2000);
  const nowIso = new Date().toISOString();

  const index = setupFeedbackStore.entries.findIndex((entry) => entry.symbol === symbol && entry.date === date);
  if (index >= 0) {
    const previous = setupFeedbackStore.entries[index];
    setupFeedbackStore.entries[index] = {
      ...previous,
      verdict,
      tags,
      notes,
      updatedAt: nowIso
    };
  } else {
    setupFeedbackStore.entries.push({
      symbol,
      date,
      verdict,
      tags,
      notes,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  }

  setupFeedbackStore.entries.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  scheduleSetupFeedbackPersist();

  return setupFeedbackStore.entries.find((entry) => entry.symbol === symbol && entry.date === date) || null;
}

function listSetupFeedbackEntries({ symbol = null, limit = 500 } = {}) {
  ensureSetupFeedbackStoreShape();
  const normalizedSymbol = symbol ? String(symbol).trim().toUpperCase() : null;

  const filtered = normalizedSymbol
    ? setupFeedbackStore.entries.filter((entry) => entry.symbol === normalizedSymbol)
    : setupFeedbackStore.entries;

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Number(limit), 5000) : 500;
  return filtered.slice(0, safeLimit);
}

function recordSetupSnapshotRecords(records = [], marketRegime = null, snapshotDate = null) {
  ensureSetupSnapshotsStoreShape();
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  const dayKey = getSnapshotDateKey(snapshotDate);
  const existing = setupSnapshotsStore.byDate[dayKey];
  const dayBucket = existing && typeof existing === 'object'
    ? {
        date: dayKey,
        marketState: existing.marketState || (marketRegime && marketRegime.state) || null,
        generatedAt: existing.generatedAt || new Date().toISOString(),
        symbols: existing.symbols && typeof existing.symbols === 'object' ? existing.symbols : {}
      }
    : {
        date: dayKey,
        marketState: (marketRegime && marketRegime.state) || null,
        generatedAt: new Date().toISOString(),
        symbols: {}
      };

  records.forEach((record) => {
    const symbol = String((record && record.symbol) || '').trim().toUpperCase();
    if (!symbol) return;

    const close = Number(record && record.close);
    if (!Number.isFinite(close) || close <= 0) return;

    const state = String((record && record.state) || '').trim();
    const score = Number(record && record.score);
    const tags = uniqueStrings(Array.isArray(record && record.tags) ? record.tags.map((tag) => normalizeTagId(tag)).filter(Boolean) : []);

    dayBucket.symbols[symbol] = {
      close,
      state: state || null,
      score: Number.isFinite(score) ? score : null,
      tags
    };
  });

  dayBucket.generatedAt = new Date().toISOString();
  if (marketRegime && marketRegime.state) {
    dayBucket.marketState = marketRegime.state;
  }

  setupSnapshotsStore.byDate[dayKey] = dayBucket;
  pruneSetupSnapshotsRetention();
  scheduleSetupSnapshotsPersist();

  return dayKey;
}

function quantile(values = [], q = 0.5) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * Math.max(0, Math.min(1, q));
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function summarizeReturns(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      samples: 0,
      avgReturn: null,
      medianReturn: null,
      winRate: null,
      p10: null,
      p90: null
    };
  }

  const wins = values.filter((value) => Number.isFinite(value) && value > 0).length;
  const avg = values.reduce((acc, value) => acc + value, 0) / values.length;

  return {
    samples: values.length,
    avgReturn: roundTo(avg, 2),
    medianReturn: roundTo(quantile(values, 0.5), 2),
    winRate: roundTo((wins / values.length) * 100, 2),
    p10: roundTo(quantile(values, 0.1), 2),
    p90: roundTo(quantile(values, 0.9), 2)
  };
}

function buildSetupTagAnalytics({ horizons = [5, 10, 20], minSamples = 15 } = {}) {
  ensureSetupSnapshotsStoreShape();
  const dayKeys = Object.keys(setupSnapshotsStore.byDate).sort();
  const safeHorizons = uniqueStrings((horizons || []).map((item) => String(item).trim()))
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b);

  const statsByTag = new Map();

  dayKeys.forEach((dayKey, index) => {
    const daySnapshot = setupSnapshotsStore.byDate[dayKey];
    if (!daySnapshot || !daySnapshot.symbols || typeof daySnapshot.symbols !== 'object') return;

    safeHorizons.forEach((horizon) => {
      const futureDayKey = dayKeys[index + horizon];
      if (!futureDayKey) return;

      const futureSnapshot = setupSnapshotsStore.byDate[futureDayKey];
      if (!futureSnapshot || !futureSnapshot.symbols || typeof futureSnapshot.symbols !== 'object') return;

      Object.entries(daySnapshot.symbols).forEach(([symbol, origin]) => {
        const future = futureSnapshot.symbols[symbol];
        if (!future) return;

        const from = Number(origin && origin.close);
        const to = Number(future && future.close);
        if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0) return;

        const ret = ((to / from) - 1) * 100;
        const score = Number(origin && origin.score);
        const state = String((origin && origin.state) || '').trim() || 'Unknown';
        const tags = uniqueStrings(Array.isArray(origin && origin.tags) ? origin.tags : []);

        tags.forEach((tag) => {
          const tagId = normalizeTagId(tag);
          if (!tagId) return;

          let node = statsByTag.get(tagId);
          if (!node) {
            node = {
              tag: tagId,
              occurrences: 0,
              scoreSum: 0,
              scoreCount: 0,
              stateCounts: {},
              horizons: {}
            };
            statsByTag.set(tagId, node);
          }

          node.occurrences += 1;
          if (Number.isFinite(score)) {
            node.scoreSum += score;
            node.scoreCount += 1;
          }
          node.stateCounts[state] = (node.stateCounts[state] || 0) + 1;

          if (!node.horizons[horizon]) {
            node.horizons[horizon] = [];
          }
          node.horizons[horizon].push(ret);
        });
      });
    });
  });

  const tagStats = Array.from(statsByTag.values())
    .map((node) => {
      const horizonStats = {};
      safeHorizons.forEach((horizon) => {
        horizonStats[horizon] = summarizeReturns(node.horizons[horizon] || []);
      });

      return {
        tag: node.tag,
        occurrences: node.occurrences,
        avgScore: node.scoreCount > 0 ? roundTo(node.scoreSum / node.scoreCount, 2) : null,
        stateCounts: node.stateCounts,
        horizons: horizonStats
      };
    })
    .filter((item) => item.occurrences >= minSamples)
    .sort((a, b) => b.occurrences - a.occurrences);

  return {
    generatedAt: new Date().toISOString(),
    snapshotDays: dayKeys.length,
    fromDate: dayKeys[0] || null,
    toDate: dayKeys[dayKeys.length - 1] || null,
    horizons: safeHorizons,
    minSamples,
    tagStats
  };
}

function getSetupStateStyle(actionState) {
  switch (actionState) {
    case 'Actionable':
      return {
        color: '#22c55e',
        badgeClass: 'bg-green-500/20 text-green-400 border-green-500/40',
        rowClass: 'bg-green-500/6'
      };
    case 'Close':
      return {
        color: '#60a5fa',
        badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        rowClass: 'bg-blue-500/6'
      };
    case 'Watch':
      return {
        color: '#f59e0b',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        rowClass: 'bg-amber-500/6'
      };
    case 'Uncovered':
      return {
        color: '#94a3b8',
        badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
        rowClass: 'bg-slate-500/6'
      };
    default:
      return {
        color: '#ef4444',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
        rowClass: 'bg-red-500/6'
      };
  }
}

function deriveSetupTagsAndType({ stock, evaluation, yearsSinceListing, config }) {
  const criteria = evaluation.criteria || {};
  const metrics = evaluation.metrics || {};
  const tags = [];

  const coreTrend =
    criteria.priceAboveSMA50Pass &&
    criteria.priceAboveSMA150Pass &&
    criteria.priceAboveSMA200Pass &&
    criteria.sma150Above200Pass &&
    criteria.sma50Above150And200Pass;

  const coreUniverse =
    criteria.quoteAvailable &&
    criteria.minPricePass;

  if (coreTrend) {
    tags.push('stage-2', 'trend-template');
  }

  if (criteria.pctBelow52WeekHighPass) tags.push('near-high');
  if (criteria.preferredRSPass) tags.push('momentum-rs');
  if (Number(metrics.rs) >= config.leadership.eliteRS) tags.push('rs-elite');

  if (criteria.epsGrowthPass) tags.push('eps-growth');
  if (criteria.revenueGrowthPass) tags.push('revenue-growth');
  if (criteria.epsAccelerationPass) tags.push('eps-accel');
  if (criteria.revenueAccelerationPass) tags.push('revenue-accel');

  if (Number.isFinite(metrics.relativeVolume10d) && metrics.relativeVolume10d <= 0.8 && metrics.relativeVolume10d >= 0.3) {
    tags.push('volume-dry-up');
  }
  if (Number.isFinite(metrics.relativeVolume10d) && metrics.relativeVolume10d >= 1.3) {
    tags.push('volume-expansion');
  }

  if (Number.isFinite(yearsSinceListing) && yearsSinceListing <= 10) {
    tags.push('ipo');
  }
  if (Number.isFinite(yearsSinceListing) && yearsSinceListing <= 3) {
    tags.push('ipo-young');
  }

  const isPowerPlay =
    coreUniverse &&
    criteria.priceAboveSMA50Pass &&
    Number.isFinite(stock.sma20) && stock.sma20 > 0 && stock.price > stock.sma20 &&
    Number(metrics.rs) >= config.leadership.eliteRS &&
    ((Number(stock.perf3M) >= 30) || (Number(stock.perf1M) >= 12)) &&
    Number.isFinite(metrics.pctBelow52WeekHigh) && metrics.pctBelow52WeekHigh <= 10;

  if (isPowerPlay) tags.push('power-play');

  const isVCPCandidate =
    coreUniverse &&
    coreTrend &&
    Number(metrics.rs) >= 80 &&
    Number.isFinite(metrics.pctBelow52WeekHigh) && metrics.pctBelow52WeekHigh <= 12 &&
    criteria.notExtendedFromSMA20Pass &&
    Number.isFinite(metrics.relativeVolume10d) && metrics.relativeVolume10d <= 1.15 && metrics.relativeVolume10d >= 0.3;

  if (isVCPCandidate) tags.push('vcp-candidate');

  const isCheat =
    coreTrend &&
    Number.isFinite(metrics.pctBelow52WeekHigh) && metrics.pctBelow52WeekHigh <= 4 &&
    criteria.notExtendedFromSMA20Pass &&
    Number.isFinite(metrics.relativeVolume10d) && metrics.relativeVolume10d <= 1.2;

  if (isCheat) tags.push('cheat');

  const isLowCheat =
    coreTrend &&
    Number.isFinite(metrics.pctAboveSMA20) && metrics.pctAboveSMA20 >= -2 && metrics.pctAboveSMA20 <= 3 &&
    Number.isFinite(metrics.pctBelow52WeekHigh) && metrics.pctBelow52WeekHigh <= 12;

  if (isLowCheat) tags.push('low-cheat');

  const isCupCandidate =
    coreTrend &&
    Number.isFinite(metrics.pctBelow52WeekHigh) && metrics.pctBelow52WeekHigh >= 6 && metrics.pctBelow52WeekHigh <= 20 &&
    Number.isFinite(metrics.pctAbove52WeekLow) && metrics.pctAbove52WeekLow >= 35 &&
    Number(stock.perf3M) > 0;

  if (isCupCandidate) tags.push('cup-candidate');

  let reboundsEstimate = null;
  if (coreTrend) {
    let reboundsScore = 1;
    if (criteria.notExtendedFromSMA20Pass) reboundsScore += 1;
    if (Number.isFinite(metrics.relativeVolume10d) && metrics.relativeVolume10d <= 1.0) reboundsScore += 1;
    if (Number.isFinite(metrics.pctBelow52WeekHigh) && metrics.pctBelow52WeekHigh <= 10) reboundsScore += 1;
    reboundsEstimate = Math.max(1, Math.min(4, reboundsScore));
    tags.push(`rebounds-${reboundsEstimate}`);

  }

  let baseWeeksEstimate = null;
  if (coreTrend) {
    const abs1M = Math.abs(Number(stock.perf1M) || 0);
    const abs3M = Math.abs(Number(stock.perf3M) || 0);

    if (abs1M <= 5 && abs3M <= 15) {
      baseWeeksEstimate = 8;
      tags.push('base-8-12w');
    } else if (abs1M <= 8 && abs3M <= 22) {
      baseWeeksEstimate = 6;
      tags.push('base-6-8w');
    } else if (abs1M <= 12 && abs3M <= 30) {
      baseWeeksEstimate = 4;
      tags.push('base-4-6w');
    }
  }

  const autoTags = uniqueStrings(tags.map((tag) => normalizeTagId(tag)).filter(Boolean));

  let setupType = 'Early candidate - manual review required';
  if (isPowerPlay) setupType = 'Power Play candidate';
  else if (isVCPCandidate) setupType = 'VCP candidate';
  else if (isCheat) setupType = 'Cheat candidate';
  else if (isLowCheat) setupType = 'Low-cheat candidate';
  else if (isCupCandidate) setupType = 'Cup candidate';
  else if (coreTrend) setupType = 'Stage 2 candidate - chart review required';

  return {
    setupType,
    autoTags,
    pattern: {
      reboundsEstimate,
      baseWeeksEstimate,
      yearsSinceListing: Number.isFinite(yearsSinceListing) ? roundTo(yearsSinceListing, 2) : null
    }
  };
}

function buildSetupProfileFromEvaluation(stock, evaluation, config, feedbackEntry = null) {
  const yearsSinceListing = calculateYearsSinceUnixSeconds(Number(stock.firstBarTime) || 0);
  const setupDerived = deriveSetupTagsAndType({
    stock,
    evaluation,
    yearsSinceListing,
    config
  });

  const manualFeedback = feedbackEntry
    ? {
        date: getSnapshotDateKey(feedbackEntry.date),
        verdict: normalizeFeedbackVerdict(feedbackEntry.verdict),
        tags: parseFeedbackTags(feedbackEntry.tags),
        notes: String(feedbackEntry.notes || '').trim(),
        updatedAt: feedbackEntry.updatedAt || null
      }
    : null;

  const manualTags = manualFeedback ? manualFeedback.tags : [];
  const tags = uniqueStrings([...setupDerived.autoTags, ...manualTags]);
  const setupStyle = getSetupStateStyle(evaluation.actionState);

  return {
    setupProfile: {
      state: evaluation.actionState,
      score: evaluation.totalScore,
      hardPass: evaluation.hardPass,
      type: setupDerived.setupType,
      tags,
      autoTags: setupDerived.autoTags,
      manualTags,
      style: setupStyle,
      pattern: setupDerived.pattern,
      feedback: manualFeedback,
      positives: evaluation.positives || [],
      negatives: evaluation.negatives || [],
      reviewFlags: evaluation.reviewFlags || [],
      metrics: evaluation.metrics || {}
    },
    tags,
    autoTags: setupDerived.autoTags,
    manualTags,
    setupType: setupDerived.setupType,
    setupStyle,
    pattern: setupDerived.pattern,
    feedback: manualFeedback
  };
}

function applySetupProfilesToStocks(stocks = [], marketRegime = null, config = null, feedbackBySymbol = null) {
  const resolvedConfig = config || loadMinerviniConfig();
  const feedbackMap = feedbackBySymbol || getLatestSetupFeedbackBySymbol();

  const evaluations = stocks.map((stock) => {
    const baseEvaluation = evaluateMinerviniCandidate(
      stock,
      resolvedConfig,
      marketRegime
    );

    const setup = buildSetupProfileFromEvaluation(
      stock,
      baseEvaluation,
      resolvedConfig,
      feedbackMap.get(stock.symbol) || null
    );

    return {
      ...baseEvaluation,
      setupType: setup.setupType,
      tags: setup.tags,
      autoTags: setup.autoTags,
      manualTags: setup.manualTags,
      setupStyle: setup.setupStyle,
      pattern: setup.pattern,
      feedback: setup.feedback,
      setup: setup.setupProfile
    };
  });

  const enrichedStocks = stocks.map((stock, index) => ({
    ...stock,
    setupProfile: evaluations[index].setup
  }));

  return {
    stocks: enrichedStocks,
    evaluations
  };
}

function recordSetupSnapshotsFromEvaluations(evaluations = [], marketRegime = null) {
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    return null;
  }

  const snapshotRecords = evaluations.map((item) => ({
    symbol: item.symbol,
    close: item.metrics && Number.isFinite(item.metrics.price) ? item.metrics.price : null,
    state: item.actionState,
    score: item.totalScore,
    tags: item.tags || []
  }));

  return recordSetupSnapshotRecords(snapshotRecords, marketRegime);
}


function getDefaultMinerviniConfig() {
  return {
    version: 1,
    scope: {
      market: 'USA',
      frequency: 'EOD',
      runAfterClose: true
    },
    universe: {
      minPrice: 10,
      requireQuote: true
    },
    fundamentals: {
      requireCoverage: true,
      minEPSGrowth: 20,
      minRevenueGrowth: 20,
      minNetMargin: 0,
      minOperatingMargin: 0,
      requireEPSAcceleration: false,
      requireRevenueAcceleration: false
    },
    trendTemplate: {
      requirePriceAboveSMA50: true,
      requirePriceAboveSMA150: true,
      requirePriceAboveSMA200: true,
      requireSMA150AboveSMA200: true,
      requireSMA50AboveSMA150AndSMA200: true,
      minPctAbove52WeekLow: 25,
      maxPctBelow52WeekHigh: 25
    },
    leadership: {
      minRS: 70,
      preferredRS: 85,
      eliteRS: 90,
      requirePositivePerf3M: true,
      requirePositivePerf6M: false
    },
    actionability: {
      actionableScoreMin: 85,
      closeScoreMin: 75,
      watchScoreMin: 65,
      actionableMaxPctBelow52WeekHigh: 10,
      closeMaxPctBelow52WeekHigh: 15,
      maxPctAboveSMA20: 12
    },
    weights: {
      universe: 10,
      fundamentals: 25,
      trendTemplate: 20,
      leadership: 15,
      actionability: 15
    },
    output: {
      actionableLimit: 15,
      includeUncovered: true
    }
  };
}

function ensureMinerviniConfigDir() {
  if (!fs.existsSync(MINERVINI_CONFIG_DIR)) {
    fs.mkdirSync(MINERVINI_CONFIG_DIR, { recursive: true });
  }
}

function loadMinerviniConfig() {
  const fallback = getDefaultMinerviniConfig();

  try {
    ensureMinerviniConfigDir();
    if (!fs.existsSync(MINERVINI_CONFIG_FILE)) {
      fs.writeFileSync(MINERVINI_CONFIG_FILE, JSON.stringify(fallback, null, 2), 'utf8');
      return fallback;
    }

    const raw = fs.readFileSync(MINERVINI_CONFIG_FILE, 'utf8');
    if (!raw.trim()) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      scope: { ...fallback.scope, ...(parsed.scope || {}) },
      universe: { ...fallback.universe, ...(parsed.universe || {}) },
      fundamentals: { ...fallback.fundamentals, ...(parsed.fundamentals || {}) },
      trendTemplate: { ...fallback.trendTemplate, ...(parsed.trendTemplate || {}) },
      leadership: { ...fallback.leadership, ...(parsed.leadership || {}) },
      actionability: { ...fallback.actionability, ...(parsed.actionability || {}) },
      weights: { ...fallback.weights, ...(parsed.weights || {}) },
      output: { ...fallback.output, ...(parsed.output || {}) }
    };
  } catch (error) {
    console.warn('⚠️ No se pudo cargar config Minervini. Usando defaults:', error.message);
    return fallback;
  }
}

function safePercent(value) {
  return Number.isFinite(value) ? roundTo(value, 2) : null;
}

function isReasonableMargin(value) {
  return Number.isFinite(value) && value >= -100 && value <= 100;
}

function calculatePercentAboveLow(price, low) {
  if (!Number.isFinite(price) || !Number.isFinite(low) || low <= 0) return null;
  return ((price / low) - 1) * 100;
}

function calculatePercentBelowHigh(price, high) {
  if (!Number.isFinite(price) || !Number.isFinite(high) || high <= 0) return null;
  return ((high - price) / high) * 100;
}

function calculatePercentAboveLine(price, line) {
  if (!Number.isFinite(price) || !Number.isFinite(line) || line <= 0) return null;
  return ((price / line) - 1) * 100;
}

function calculateYearsSinceUnixSeconds(unixSeconds) {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return null;
  return (Date.now() - (unixSeconds * 1000)) / (365.25 * 24 * 60 * 60 * 1000);
}

function summarizeExplanations(list = []) {
  return list.filter(Boolean).slice(0, 6);
}


/**

 * Calcula el RS Score a partir de datos de performance de TradingView

 * Adapta los datos disponibles a la metodología CAN SLIM

 * @param {Object} perfData - { perf3M, perf6M, perfY, changeFrom1M }

 * @returns {Object} { score, quarters, tempRS }

 */

function logRSRatingStats(stats) {
  if (!stats) return;

  console.log('\n[RS] RS Rating Statistics:');
  console.log(`   Universe size: ${stats.universeSize} stocks`);
  console.log(`   Average RS Score: ${stats.average.toFixed(2)}%`);
  console.log(`   Median RS Score: ${stats.median.toFixed(2)}%`);
  console.log(`   Std Deviation: ${stats.stdDev.toFixed(2)}%`);
  console.log(`   Best performer: ${stats.best.symbol} (${stats.best.score.toFixed(2)}%)`);
  console.log(`   Worst performer: ${stats.worst.symbol} (${stats.worst.score.toFixed(2)}%)\n`);
}

function calculateLegacyRSScoreFromPerformance(perfData) {
  const { perf1M, perf3M, perf6M, perfY } = perfData;

  if (perf3M === null || perf6M === null || perfY === null) {
    return {
      score: null,
      quarters: { q1: null, q2: null, q3: null, q4: null },
      tempRS: 50
    };
  }

  const q1Change = Number(perf3M) || 0;
  const q2Change = calculateLegacyPeriodReturn(perf6M, perf3M);
  const sixToTwelveMonthReturn = calculateLegacyPeriodReturn(perfY, perf6M);
  const splitSixMonth = splitLegacyCombinedReturnInHalf(sixToTwelveMonthReturn);
  const q3Change = splitSixMonth.q1;
  const q4Change = splitSixMonth.q2;

  const rsScore = (q1Change * 0.40) + (q2Change * 0.20) + (q3Change * 0.20) + (q4Change * 0.20);
  const momentumBoost = Number.isFinite(perf1M) ? Math.max(-5, Math.min(5, perf1M / 4)) : 0;
  const adjustedScore = rsScore + momentumBoost;
  const tempRS = Math.max(1, Math.min(99, Math.round(50 + (adjustedScore / 2))));

  return {
    score: adjustedScore,
    quarters: {
      q1: q1Change,
      q2: q2Change,
      q3: q3Change,
      q4: q4Change
    },
    tempRS
  };
}

function calculateLegacyPeriodReturn(longWindowReturn, shortWindowReturn) {
  if (!Number.isFinite(longWindowReturn) || !Number.isFinite(shortWindowReturn)) {
    return 0;
  }

  const longFactor = 1 + (longWindowReturn / 100);
  const shortFactor = 1 + (shortWindowReturn / 100);
  if (longFactor <= 0 || shortFactor <= 0) {
    return Number(longWindowReturn) - Number(shortWindowReturn);
  }

  return ((longFactor / shortFactor) - 1) * 100;
}

function splitLegacyCombinedReturnInHalf(combinedReturn) {
  if (!Number.isFinite(combinedReturn)) {
    return { q1: 0, q2: 0 };
  }

  const combinedFactor = 1 + (combinedReturn / 100);
  if (combinedFactor > 0) {
    const quarterFactor = Math.pow(combinedFactor, 0.5);
    const quarterReturn = (quarterFactor - 1) * 100;
    return { q1: quarterReturn, q2: quarterReturn };
  }

  const half = combinedReturn * 0.5;
  return { q1: half, q2: half };
}

function calculateLegacyRSScore(priceData) {
  const { current, month3, month6, month9, month12 } = priceData;



  // Verificar que tenemos todos los datos necesarios

  if (!current || !month3 || !month6 || !month9 || !month12) {

    return null; // Datos insuficientes

  }



  // Calcular variaciones porcentuales de cada trimestre

  const q1Change = ((current - month3) / month3) * 100;      // últimos 3 meses (40%)
  const q2Change = ((month3 - month6) / month6) * 100;       // 3-6 meses atrás (20%)

  const q3Change = ((month6 - month9) / month9) * 100;       // 6-9 meses atrás (20%)

  const q4Change = ((month9 - month12) / month12) * 100;     // 9-12 meses atrás (20%)



  // Aplicar pesos según metodología O'Neil

  const rsScore = (q1Change * 0.40) + (q2Change * 0.20) + (q3Change * 0.20) + (q4Change * 0.20);



  return {

    score: rsScore,

    q1: q1Change,

    q2: q2Change,

    q3: q3Change,

    q4: q4Change

  };

}



/**

 * Convierte los RS Scores en ratings de 1-99 basados en percentiles

 * @param {Array} stocksWithScores - Array de { symbol, score, quarters }

 * @returns {Object} Mapa de symbol -> RS Rating (1-99)

 */

function calculateLegacyRSRatings(stocksWithScores) {
  // Filtrar acciones sin datos suficientes

  const validStocks = stocksWithScores.filter(s => s.score !== null && !isNaN(s.score));



  if (validStocks.length === 0) return {};



  // Ordenar por score descendente

  validStocks.sort((a, b) => {

    if (b.score !== a.score) return b.score - a.score;

    // En caso de empate, priorizar mejor Q1 (más reciente)

    return b.quarters.q1 - a.quarters.q1;

  });



  // Calcular estadísticas

  const scores = validStocks.map(s => s.score);

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const sortedScores = [...scores].sort((a, b) => a - b);

  const median = sortedScores[Math.floor(sortedScores.length / 2)];

  const variance = scores.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / scores.length;

  const stdDev = Math.sqrt(variance);



  console.log('\n[RS] RS Rating Statistics:');
  console.log(`   Universe size: ${validStocks.length} stocks`);

  console.log(`   Average RS Score: ${avg.toFixed(2)}%`);

  console.log(`   Median RS Score: ${median.toFixed(2)}%`);

  console.log(`   Std Deviation: ${stdDev.toFixed(2)}%`);

  console.log(`   Best performer: ${validStocks[0].symbol} (${validStocks[0].score.toFixed(2)}%)`);

  console.log(`   Worst performer: ${validStocks[validStocks.length-1].symbol} (${validStocks[validStocks.length-1].score.toFixed(2)}%)\n`);



  // Convertir posiciones en percentiles (1-99)

  const ratings = {};

  validStocks.forEach((stock, index) => {

    // Percentil: (rank / total) * 100, invertido porque mejor = más alto

    const percentile = ((validStocks.length - index - 1) / (validStocks.length - 1)) * 98 + 1;

    const rating = Math.round(percentile);



    ratings[stock.symbol] = {

      rating: Math.max(1, Math.min(99, rating)),

      score: stock.score,

      quarters: stock.quarters,

      rank: index + 1,

      timestamp: Date.now()

    };

  });



  return ratings;

}



/**

 * Función temporal que simula RS hasta tener datos históricos reales

 * En producci?n, esto se reemplazará con cálculo basado en datos históricos

 */

function calculateRS(changePercent) {
  // Normalizar entre 1-99 basado en cambio porcentual del día
  // Esto es TEMPORAL - el RS real se calcula con datos de 12 meses
  const normalized = (changePercent + 10) / 20 * 100;
  return Math.max(1, Math.min(99, Math.round(normalized)));
}

function hasFundamentalFilters(filters = {}) {
  return Boolean(
    filters.requireFundamentals ||
    filters.epsGrowthMin !== undefined ||
    filters.revenueGrowthMin !== undefined ||
    filters.grossMarginMin !== undefined ||
    filters.operatingMarginMin !== undefined ||
    filters.netMarginMin !== undefined
  );
}

function applyRSRatingsToStocks(stocks = []) {
  if (stocks.length === 0) {
    return stocks;
  }

  if (Object.keys(rsRatingCache.data).length > 0) {
    stocks.forEach((stock) => {
      const rsData = rsRatingCache.data[stock.symbol];
      if (rsData) {
        stock.relativeStrength = rsData.rating;
        stock.rsScore = rsData.score;
        stock.rsRank = rsData.rank;
      }
    });
    return stocks;
  }

  const localScores = stocks
    .filter((stock) => stock.rsScore !== null && !Number.isNaN(stock.rsScore))
    .map((stock) => ({
      symbol: stock.symbol,
      score: stock.rsScore,
      quarters: stock.rsQuarters || {}
    }));

  if (localScores.length > 0) {
    const localRatings = calculatePreciseRSRatings(localScores, { onStats: logRSRatingStats });
    stocks.forEach((stock) => {
      const rsData = localRatings[stock.symbol];
      if (rsData) {
        stock.relativeStrength = rsData.rating;
        stock.rsScore = rsData.score;
        stock.rsRank = rsData.rank;
      }
    });
  }

  if (!rsRatingCache.isCalculating) {
    calculateRSRatingsBackground().catch((error) => {
      console.warn('⚠️ No se pudo disparar cálculo RS en background:', error.message);
    });
  }

  return stocks;
}

function addFundamentalsAndQueueMissing(stocks = []) {
  const enrichedData = addFundamentalsSummaryToStocks(stocks);
  const missingFundamentals = enrichedData
    .filter((stock) => !stock.fundamentals || stock.fundamentals.coverage === 'missing')
    .map((stock) => stock.symbol);

  if (missingFundamentals.length > 0) {
    queueFundamentalsSync(missingFundamentals);
  }

  return enrichedData;
}

async function getUniverseSnapshot({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && universeSnapshotCache.data && (now - universeSnapshotCache.timestamp) < SNAPSHOT_CACHE_DURATION) {
    return universeSnapshotCache.data;
  }

  if (universeSnapshotCache.inflight && !forceRefresh) {
    return universeSnapshotCache.inflight;
  }

  const requestToken = universeSnapshotCache.token;
  const request = (async () => {
    const symbols = getUniverseSymbols();
    const stocks = await getTradingViewData(symbols, { forceRefresh });
    applyRSRatingsToStocks(stocks);
    const enrichedData = addFundamentalsAndQueueMissing(stocks);

    if (universeSnapshotCache.token === requestToken) {
      universeSnapshotCache.data = enrichedData;
      universeSnapshotCache.timestamp = Date.now();
    }

    return enrichedData;
  })();

  universeSnapshotCache.inflight = request;

  try {
    return await request;
  } finally {
    if (universeSnapshotCache.inflight === request) {
      universeSnapshotCache.inflight = null;
    }
  }
}

async function getMarketRegime({ forceRefresh = false } = {}) {
  const indices = await getTradingViewData(['^GSPC', '^IXIC', '^RUT'], { forceRefresh });
  const summary = indices.map((index) => ({
    symbol: index.symbol,
    price: index.price,
    sma50: index.sma50,
    sma200: index.sma200,
    changePercent: index.changePercent,
    above50: Number.isFinite(index.price) && Number.isFinite(index.sma50) && index.sma50 > 0 ? index.price > index.sma50 : false,
    above200: Number.isFinite(index.price) && Number.isFinite(index.sma200) && index.sma200 > 0 ? index.price > index.sma200 : false,
    sma50Above200: Number.isFinite(index.sma50) && Number.isFinite(index.sma200) && index.sma50 > 0 && index.sma200 > 0 ? index.sma50 > index.sma200 : false,
    upDay: Number.isFinite(index.changePercent) ? index.changePercent >= 0 : false
  }));

  const score = summary.reduce((acc, item) => {
    return acc
      + (item.above50 ? 1 : 0)
      + (item.above200 ? 1 : 0)
      + (item.sma50Above200 ? 1 : 0)
      + (item.upDay ? 1 : 0);
  }, 0);

  let state = 'WATCH ONLY';
  if (score >= 10) {
    state = 'GO';
  } else if (score >= 7) {
    state = 'CAUTIOUS';
  } else if (score >= 4) {
    state = 'DEFENSIVE';
  }

  return {
    state,
    score,
    indices: summary,
    generatedAt: new Date().toISOString()
  };
}

function getCriterionCatalog() {
  return [
    { key: 'quoteAvailable', label: 'Quote usable', block: 'universe' },
    { key: 'minPricePass', label: 'Min price', block: 'universe' },
    { key: 'priceAboveSMA50Pass', label: 'Price above SMA50', block: 'trend' },
    { key: 'priceAboveSMA150Pass', label: 'Price above SMA150', block: 'trend' },
    { key: 'priceAboveSMA200Pass', label: 'Price above SMA200', block: 'trend' },
    { key: 'sma150Above200Pass', label: 'SMA150 above SMA200', block: 'trend' },
    { key: 'sma50Above150And200Pass', label: 'SMA50 above SMA150 and SMA200', block: 'trend' },
    { key: 'pctAbove52WeekLowPass', label: '25% above 52-week low', block: 'trend' },
    { key: 'pctBelow52WeekHighPass', label: 'Within 25% of 52-week high', block: 'trend' },
    { key: 'rsMinPass', label: 'RS minimum', block: 'leadership' },
    { key: 'preferredRSPass', label: 'Preferred RS', block: 'leadership' },
    { key: 'positivePerf3MPass', label: 'Positive 3M performance', block: 'leadership' },
    { key: 'positivePerf6MPass', label: 'Positive 6M performance', block: 'leadership' },
    { key: 'hasFundamentals', label: 'Fundamentals coverage', block: 'fundamentals' },
    { key: 'epsGrowthPass', label: 'EPS growth minimum', block: 'fundamentals' },
    { key: 'revenueGrowthPass', label: 'Revenue growth minimum', block: 'fundamentals' },
    { key: 'netMarginPass', label: 'Net margin minimum', block: 'fundamentals' },
    { key: 'operatingMarginPass', label: 'Operating margin minimum', block: 'fundamentals' },
    { key: 'epsAccelerationPass', label: 'EPS acceleration', block: 'fundamentals' },
    { key: 'revenueAccelerationPass', label: 'Revenue acceleration', block: 'fundamentals' },
    { key: 'nearHighForActionablePass', label: 'Near high for actionable state', block: 'actionability' },
    { key: 'notExtendedFromSMA20Pass', label: 'Not extended from SMA20', block: 'actionability' },
    { key: 'relativeVolumeHealthyPass', label: 'Relative volume healthy', block: 'actionability' }
  ];
}

function evaluateMinerviniCandidate(stock, config, marketRegime) {
  const fundamentals = stock.fundamentals || {};
  const hasFundamentals = Boolean(fundamentals && fundamentals.hasFundamentals);
  const price = Number(stock.price) || 0;
  const dollarVolume = Number(stock.dollarVolume) || (price * (Number(stock.volume) || 0));
  const avgVolume30d = Number(stock.averageVolume30d) || 0;
  const pctAbove52WeekLow = calculatePercentAboveLow(price, Number(stock.price52WeekLow) || 0);
  const pctBelow52WeekHigh = calculatePercentBelowHigh(price, Number(stock.price52WeekHigh) || 0);
  const pctAboveSMA20 = calculatePercentAboveLine(price, Number(stock.sma20) || 0);
  const netMargin = isReasonableMargin(fundamentals.netMargin) ? fundamentals.netMargin : null;
  const operatingMargin = isReasonableMargin(fundamentals.operatingMargin) ? fundamentals.operatingMargin : null;

  const criteria = {
    quoteAvailable: stock.quoteStatus !== 'unavailable' && price > 0,
    minPricePass: price >= config.universe.minPrice,
    hasFundamentals,
    epsGrowthPass: hasFundamentals && Number.isFinite(fundamentals.epsGrowth) && fundamentals.epsGrowth >= config.fundamentals.minEPSGrowth,
    revenueGrowthPass: hasFundamentals && Number.isFinite(fundamentals.revenueGrowth) && fundamentals.revenueGrowth >= config.fundamentals.minRevenueGrowth,
    netMarginPass: hasFundamentals && Number.isFinite(netMargin) && netMargin >= config.fundamentals.minNetMargin,
    operatingMarginPass: hasFundamentals && Number.isFinite(operatingMargin) && operatingMargin >= config.fundamentals.minOperatingMargin,
    epsAccelerationPass: hasFundamentals && fundamentals.epsAcceleration === true,
    revenueAccelerationPass: hasFundamentals && fundamentals.revenueAcceleration === true,
    priceAboveSMA50Pass: Number.isFinite(stock.sma50) && stock.sma50 > 0 ? price > stock.sma50 : false,
    priceAboveSMA150Pass: Number.isFinite(stock.sma150) && stock.sma150 > 0 ? price > stock.sma150 : false,
    priceAboveSMA200Pass: Number.isFinite(stock.sma200) && stock.sma200 > 0 ? price > stock.sma200 : false,
    sma150Above200Pass: Number.isFinite(stock.sma150) && Number.isFinite(stock.sma200) && stock.sma150 > 0 && stock.sma200 > 0 ? stock.sma150 > stock.sma200 : false,
    sma50Above150And200Pass: Number.isFinite(stock.sma50) && Number.isFinite(stock.sma150) && Number.isFinite(stock.sma200) && stock.sma50 > 0 && stock.sma150 > 0 && stock.sma200 > 0
      ? stock.sma50 > stock.sma150 && stock.sma50 > stock.sma200
      : false,
    pctAbove52WeekLowPass: Number.isFinite(pctAbove52WeekLow) ? pctAbove52WeekLow >= config.trendTemplate.minPctAbove52WeekLow : false,
    pctBelow52WeekHighPass: Number.isFinite(pctBelow52WeekHigh) ? pctBelow52WeekHigh <= config.trendTemplate.maxPctBelow52WeekHigh : false,
    rsMinPass: Number.isFinite(stock.relativeStrength) && stock.relativeStrength >= config.leadership.minRS,
    preferredRSPass: Number.isFinite(stock.relativeStrength) && stock.relativeStrength >= config.leadership.preferredRS,
    positivePerf3MPass: Number.isFinite(stock.perf3M) ? stock.perf3M > 0 : false,
    positivePerf6MPass: Number.isFinite(stock.perf6M) ? stock.perf6M > 0 : false,
    nearHighForActionablePass: Number.isFinite(pctBelow52WeekHigh) ? pctBelow52WeekHigh <= config.actionability.actionableMaxPctBelow52WeekHigh : false,
    nearHighForClosePass: Number.isFinite(pctBelow52WeekHigh) ? pctBelow52WeekHigh <= config.actionability.closeMaxPctBelow52WeekHigh : false,
    notExtendedFromSMA20Pass: Number.isFinite(pctAboveSMA20) ? pctAboveSMA20 <= config.actionability.maxPctAboveSMA20 : false,
    relativeVolumeHealthyPass: Number.isFinite(stock.relativeVolume10d) ? stock.relativeVolume10d >= 0.8 : false
  };

  const universeScore =
    (criteria.quoteAvailable ? 6 : 0) +
    (criteria.minPricePass ? 4 : 0);

  const fundamentalsScore =
    (criteria.hasFundamentals ? 5 : 0) +
    (criteria.epsGrowthPass ? 6 : 0) +
    (criteria.revenueGrowthPass ? 6 : 0) +
    (criteria.netMarginPass ? 3 : 0) +
    (criteria.operatingMarginPass ? 2 : 0) +
    (criteria.epsAccelerationPass ? 2 : 0) +
    (criteria.revenueAccelerationPass ? 1 : 0);

  const trendScore =
    (criteria.priceAboveSMA50Pass ? 3 : 0) +
    (criteria.priceAboveSMA150Pass ? 3 : 0) +
    (criteria.priceAboveSMA200Pass ? 3 : 0) +
    (criteria.sma150Above200Pass ? 4 : 0) +
    (criteria.sma50Above150And200Pass ? 3 : 0) +
    (criteria.pctAbove52WeekLowPass ? 2 : 0) +
    (criteria.pctBelow52WeekHighPass ? 2 : 0);

  const leadershipScore =
    (criteria.rsMinPass ? 6 : 0) +
    (criteria.preferredRSPass ? 4 : 0) +
    (criteria.positivePerf3MPass ? 3 : 0) +
    (criteria.positivePerf6MPass ? 2 : 0);

  const actionabilityScore =
    (criteria.nearHighForActionablePass ? 7 : (criteria.nearHighForClosePass ? 4 : 0)) +
    (criteria.notExtendedFromSMA20Pass ? 5 : 0) +
    (criteria.relativeVolumeHealthyPass ? 3 : 0);

  const totalScore = universeScore + fundamentalsScore + trendScore + leadershipScore + actionabilityScore;

  const hardPass = [
    criteria.quoteAvailable,
    criteria.minPricePass,
    criteria.priceAboveSMA50Pass,
    criteria.priceAboveSMA150Pass,
    criteria.priceAboveSMA200Pass,
    criteria.sma150Above200Pass,
    criteria.sma50Above150And200Pass,
    criteria.pctAbove52WeekLowPass,
    criteria.pctBelow52WeekHighPass,
    criteria.rsMinPass,
    (!config.leadership.requirePositivePerf3M || criteria.positivePerf3MPass),
    (!config.leadership.requirePositivePerf6M || criteria.positivePerf6MPass),
    (!config.fundamentals.requireCoverage || criteria.hasFundamentals)
  ].every(Boolean);

  const positives = [];
  const negatives = [];

  if (criteria.preferredRSPass) positives.push(`RS ${stock.relativeStrength}`);
  if (criteria.epsGrowthPass && Number.isFinite(fundamentals.epsGrowth)) positives.push(`EPS +${roundTo(fundamentals.epsGrowth, 1)}%`);
  if (criteria.revenueGrowthPass && Number.isFinite(fundamentals.revenueGrowth)) positives.push(`Sales +${roundTo(fundamentals.revenueGrowth, 1)}%`);
  if (criteria.netMarginPass && Number.isFinite(netMargin)) positives.push(`Net margin ${roundTo(netMargin, 1)}%`);
  if (criteria.epsAccelerationPass) positives.push('EPS accelerating');
  if (criteria.revenueAccelerationPass) positives.push('Sales accelerating');
  if (criteria.pctBelow52WeekHighPass && Number.isFinite(pctBelow52WeekHigh)) positives.push(`${roundTo(pctBelow52WeekHigh, 1)}% below 52W high`);
  if (criteria.priceAboveSMA50Pass && criteria.priceAboveSMA150Pass && criteria.priceAboveSMA200Pass) positives.push('Trend template core');

  if (!criteria.hasFundamentals) negatives.push('Missing fundamentals');
  if (!criteria.epsGrowthPass) negatives.push('EPS growth below threshold');
  if (!criteria.revenueGrowthPass) negatives.push('Sales growth below threshold');
  if (!criteria.netMarginPass) negatives.push('Weak net margin');
  if (!criteria.rsMinPass) negatives.push('RS below threshold');
  if (!criteria.pctBelow52WeekHighPass) negatives.push('Too far from 52-week high');
  if (!criteria.notExtendedFromSMA20Pass) negatives.push('Extended from SMA20');
  if (!criteria.relativeVolumeHealthyPass) negatives.push('Relative volume weak');

  let actionState = 'Reject';
  if (!criteria.hasFundamentals && config.fundamentals.requireCoverage) {
    actionState = 'Uncovered';
  } else if (hardPass) {
    if (totalScore >= config.actionability.actionableScoreMin && criteria.nearHighForActionablePass && criteria.notExtendedFromSMA20Pass) {
      actionState = 'Actionable';
    } else if (totalScore >= config.actionability.closeScoreMin && criteria.nearHighForClosePass) {
      actionState = 'Close';
    } else if (totalScore >= config.actionability.watchScoreMin) {
      actionState = 'Watch';
    }
  } else if (totalScore >= config.actionability.watchScoreMin) {
    actionState = 'Watch';
  }

  if (marketRegime && marketRegime.state === 'WATCH ONLY' && actionState !== 'Reject' && actionState !== 'Uncovered') {
    actionState = 'Watch';
  } else if (marketRegime && marketRegime.state === 'DEFENSIVE' && actionState === 'Actionable') {
    actionState = 'Close';
  } else if (marketRegime && marketRegime.state === 'CAUTIOUS' && actionState === 'Actionable' && totalScore < (config.actionability.actionableScoreMin + 5)) {
    actionState = 'Close';
  }

  return {
    symbol: stock.symbol,
    company: stock.name,
    sector: stock.sector || null,
    industry: stock.industry || null,
    marketState: marketRegime ? marketRegime.state : null,
    actionState,
    hardPass,
    totalScore,
    subscores: {
      universe: universeScore,
      fundamentals: fundamentalsScore,
      trendTemplate: trendScore,
      leadership: leadershipScore,
      actionability: actionabilityScore
    },
    criteria,
    metrics: {
      price,
      dollarVolume: roundTo(dollarVolume, 0),
      averageVolume30d: roundTo(avgVolume30d, 0),
      rs: Number(stock.relativeStrength) || 0,
      pctAbove52WeekLow: safePercent(pctAbove52WeekLow),
      pctBelow52WeekHigh: safePercent(pctBelow52WeekHigh),
      pctAboveSMA20: safePercent(pctAboveSMA20),
      epsGrowth: Number.isFinite(fundamentals.epsGrowth) ? roundTo(fundamentals.epsGrowth, 1) : null,
      revenueGrowth: Number.isFinite(fundamentals.revenueGrowth) ? roundTo(fundamentals.revenueGrowth, 1) : null,
      netMargin: Number.isFinite(netMargin) ? roundTo(netMargin, 1) : null,
      operatingMargin: Number.isFinite(operatingMargin) ? roundTo(operatingMargin, 1) : null,
      relativeVolume10d: Number.isFinite(stock.relativeVolume10d) ? roundTo(stock.relativeVolume10d, 2) : null,
      floatShares: Number.isFinite(stock.floatShares) ? roundTo(stock.floatShares, 0) : null,
      peRatio: Number.isFinite(stock.peRatio) ? roundTo(stock.peRatio, 1) : null
    },
    setupType: 'Stage 2 candidate - chart review required',
    positives: summarizeExplanations(positives),
    negatives: summarizeExplanations(negatives),
    whatIsMissing: summarizeExplanations(negatives),
    reviewFlags: summarizeExplanations([
      'Validate base quality on chart',
      'Confirm pivot / VCP / handle manually',
      actionState === 'Actionable' ? null : 'Not yet fully actionable'
    ])
  };
}

function buildMinerviniDiagnostics(evaluations = [], config) {
  const catalog = getCriterionCatalog();
  const total = evaluations.length;

  const individual = catalog.map((criterion) => {
    const passCount = evaluations.reduce((acc, item) => acc + (item.criteria[criterion.key] ? 1 : 0), 0);
    const failCount = total - passCount;
    return {
      key: criterion.key,
      label: criterion.label,
      block: criterion.block,
      passCount,
      failCount,
      passPercent: total > 0 ? roundTo((passCount / total) * 100, 2) : 0,
      failPercent: total > 0 ? roundTo((failCount / total) * 100, 2) : 0
    };
  });

  const funnelOrder = [
    'quoteAvailable',
    'minPricePass',
    'priceAboveSMA50Pass',
    'priceAboveSMA150Pass',
    'priceAboveSMA200Pass',
    'sma150Above200Pass',
    'sma50Above150And200Pass',
    'pctAbove52WeekLowPass',
    'pctBelow52WeekHighPass',
    'rsMinPass',
    'hasFundamentals',
    'epsGrowthPass',
    'revenueGrowthPass',
    'netMarginPass'
  ];

  let remaining = evaluations;
  const funnel = funnelOrder.map((key) => {
    const meta = catalog.find((criterion) => criterion.key === key);
    const passed = remaining.filter((item) => item.criteria[key]);
    const step = {
      key,
      label: meta ? meta.label : key,
      remainingBefore: remaining.length,
      passCount: passed.length,
      failCount: remaining.length - passed.length,
      passPercentOfPrevious: remaining.length > 0 ? roundTo((passed.length / remaining.length) * 100, 2) : 0
    };
    remaining = passed;
    return step;
  });

  const byBlock = ['universe', 'trend', 'leadership', 'fundamentals', 'actionability'].map((block) => {
    const items = individual.filter((criterion) => criterion.block === block);
    const avgPassPercent = items.length > 0
      ? roundTo(items.reduce((acc, item) => acc + item.passPercent, 0) / items.length, 2)
      : 0;
    return {
      block,
      criteria: items.length,
      avgPassPercent
    };
  });

  const actionStateCounts = evaluations.reduce((acc, item) => {
    acc[item.actionState] = (acc[item.actionState] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    totalUniverse: total,
    configVersion: config.version,
    actionStateCounts,
    blockPassSummary: byBlock,
    largestRejectors: [...individual].sort((a, b) => b.failCount - a.failCount).slice(0, 10),
    criteria: individual,
    funnel
  };
}

async function buildMinerviniDailyReport({ forceRefresh = false, limit = null } = {}) {
  const config = loadMinerviniConfig();
  const [stocks, marketRegime] = await Promise.all([
    getUniverseSnapshot({ forceRefresh }),
    getMarketRegime({ forceRefresh })
  ]);

  const feedbackBySymbol = getLatestSetupFeedbackBySymbol();
  const { evaluations } = applySetupProfilesToStocks(stocks, marketRegime, config, feedbackBySymbol);
  const diagnostics = buildMinerviniDiagnostics(evaluations, config);
  const actionableLimit = Number.isFinite(limit) && limit > 0 ? limit : config.output.actionableLimit;

  const ranked = [...evaluations].sort((a, b) => {
    const priority = { Actionable: 4, Close: 3, Watch: 2, Uncovered: 1, Reject: 0 };
    if (priority[b.actionState] !== priority[a.actionState]) {
      return priority[b.actionState] - priority[a.actionState];
    }
    return b.totalScore - a.totalScore;
  });

  const shortlist = ranked
    .filter((item) => item.actionState === 'Actionable' || item.actionState === 'Close' || item.actionState === 'Watch')
    .slice(0, actionableLimit);

  const uncovered = config.output.includeUncovered
    ? ranked.filter((item) => item.actionState === 'Uncovered').slice(0, 10)
    : [];

  recordSetupSnapshotsFromEvaluations(evaluations, marketRegime);

  return {
    generatedAt: new Date().toISOString(),
    config,
    marketRegime,
    diagnostics,
    shortlist,
    uncovered
  };
}

function getMinerviniPresetDefinitions() {
  return [
    {
      id: 'trend-template',
      name: 'MM Trend Template',
      description: 'Nombres que ya cumplen el nucleo tecnico de Stage 2 y trend template.',
      limit: 80
    },
    {
      id: 'revenue-growth',
      name: 'MM Revenue Growth',
      description: 'Empresas con crecimiento fuerte de ventas y contexto tecnico suficientemente sano.',
      limit: 80
    },
    {
      id: 'momentum-rs',
      name: 'MM Momentum RS',
      description: 'Lideres por fuerza relativa alta, cerca de maximos y con momentum reciente.',
      limit: 80
    },
    {
      id: 'vcp-candidates',
      name: 'MM VCP Candidates',
      description: 'Candidatas a VCP por compresion, cercania a maximos y posible secado de volumen. Requiere revision visual.',
      limit: 60
    },
    {
      id: 'power-plays',
      name: 'MM Power Plays',
      description: 'Nombres con sprint fuerte, RS extrema y consolidacion corta cerca de highs.',
      limit: 40
    },
    {
      id: 'ipo-leaders',
      name: 'MM IPO Leaders',
      description: 'Leaders recientes con poca edad bursatil, RS alta y estructura fuerte.',
      limit: 50
    }
  ];
}

function buildMinerviniPresetRecords(stocks = [], config, marketRegime, feedbackBySymbol = null) {
  const feedbackMap = feedbackBySymbol || getLatestSetupFeedbackBySymbol();
  const { evaluations } = applySetupProfilesToStocks(stocks, marketRegime, config, feedbackMap);

  return evaluations.map((evaluation, index) => {
    const stock = stocks[index];
    return {
      ...evaluation,
      stock,
      yearsSinceListing: calculateYearsSinceUnixSeconds(Number(stock.firstBarTime) || 0),
      hasCoreUniverse:
        evaluation.criteria.quoteAvailable &&
        evaluation.criteria.minPricePass,
      hasCoreTrend:
        evaluation.criteria.priceAboveSMA50Pass &&
        evaluation.criteria.priceAboveSMA150Pass &&
        evaluation.criteria.priceAboveSMA200Pass &&
        evaluation.criteria.sma150Above200Pass &&
        evaluation.criteria.sma50Above150And200Pass,
      isNearHigh: evaluation.criteria.pctBelow52WeekHighPass,
      eliteRS: Number(stock.relativeStrength) >= config.leadership.eliteRS
    };
  });
}

function compareByMany(getters = []) {
  return (a, b) => {
    for (const getter of getters) {
      const av = getter(a);
      const bv = getter(b);
      if (Number.isFinite(av) && Number.isFinite(bv) && bv !== av) {
        return bv - av;
      }
      if (typeof av === 'string' && typeof bv === 'string' && bv !== av) {
        return av.localeCompare(bv);
      }
    }
    return String(a.symbol || '').localeCompare(String(b.symbol || ''));
  };
}

function buildPresetCandidatesById(presetId, records, config) {
  const sortByScore = compareByMany([
    (item) => item.totalScore,
    (item) => item.metrics.rs || 0,
    (item) => item.metrics.revenueGrowth || 0,
    (item) => item.metrics.epsGrowth || 0
  ]);

  switch (presetId) {
    case 'trend-template':
      return records
        .filter((item) =>
          item.hasCoreUniverse &&
          item.hasCoreTrend &&
          item.criteria.rsMinPass &&
          item.isNearHigh
        )
        .sort(sortByScore);
    case 'revenue-growth':
      return records
        .filter((item) =>
          item.hasCoreUniverse &&
          item.criteria.hasFundamentals &&
          Number.isFinite(item.metrics.revenueGrowth) &&
          item.metrics.revenueGrowth >= config.fundamentals.minRevenueGrowth &&
          item.criteria.priceAboveSMA50Pass &&
          item.criteria.rsMinPass
        )
        .sort(compareByMany([
          (item) => item.metrics.revenueGrowth || 0,
          (item) => item.metrics.rs || 0,
          (item) => 100 - (item.metrics.pctBelow52WeekHigh || 100),
          (item) => item.metrics.epsGrowth || 0
        ]));
    case 'momentum-rs':
      return records
        .filter((item) =>
          item.hasCoreUniverse &&
          item.hasCoreTrend &&
          Number(item.metrics.rs) >= config.leadership.preferredRS &&
          item.criteria.positivePerf3MPass &&
          item.isNearHigh
        )
        .sort(compareByMany([
          (item) => item.metrics.rs || 0,
          (item) => item.stock.perf3M || 0,
          (item) => item.stock.perf1M || 0,
          (item) => 100 - (item.metrics.pctBelow52WeekHigh || 100)
        ]));
    case 'vcp-candidates':
      return records
        .filter((item) =>
          item.hasCoreUniverse &&
          item.hasCoreTrend &&
          Number(item.metrics.rs) >= 80 &&
          Number.isFinite(item.metrics.pctBelow52WeekHigh) &&
          item.metrics.pctBelow52WeekHigh <= 12 &&
          item.criteria.notExtendedFromSMA20Pass &&
          Number.isFinite(item.stock.relativeVolume10d) &&
          item.stock.relativeVolume10d <= 1.15 &&
          item.stock.relativeVolume10d >= 0.3
        )
        .sort(compareByMany([
          (item) => 100 - (item.metrics.pctBelow52WeekHigh || 100),
          (item) => item.metrics.rs || 0,
          (item) => -(item.stock.relativeVolume10d || 999),
          (item) => item.totalScore
        ]));
    case 'power-plays':
      return records
        .filter((item) =>
          item.hasCoreUniverse &&
          item.criteria.priceAboveSMA50Pass &&
          Number.isFinite(item.stock.sma20) && item.stock.sma20 > 0 && item.stock.price > item.stock.sma20 &&
          Number(item.metrics.rs) >= config.leadership.eliteRS &&
          ((Number(item.stock.perf3M) >= 30) || (Number(item.stock.perf1M) >= 12)) &&
          Number.isFinite(item.metrics.pctBelow52WeekHigh) &&
          item.metrics.pctBelow52WeekHigh <= 10
        )
        .sort(compareByMany([
          (item) => item.metrics.rs || 0,
          (item) => item.stock.perf3M || 0,
          (item) => item.stock.perf1M || 0,
          (item) => item.totalScore
        ]));
    case 'ipo-leaders':
      return records
        .filter((item) =>
          item.hasCoreUniverse &&
          Number.isFinite(item.yearsSinceListing) &&
          item.yearsSinceListing <= 10 &&
          Number(item.metrics.rs) >= config.leadership.preferredRS &&
          item.criteria.priceAboveSMA50Pass &&
          Number.isFinite(item.metrics.pctBelow52WeekHigh) &&
          item.metrics.pctBelow52WeekHigh <= 20
        )
        .sort(compareByMany([
          (item) => -(item.yearsSinceListing || 999),
          (item) => item.metrics.rs || 0,
          (item) => item.stock.perf3M || 0,
          (item) => item.totalScore
        ]));
    default:
      return [];
  }
}

async function buildMinerviniPresetLists({ forceRefresh = false } = {}) {
  const config = loadMinerviniConfig();
  const [stocks, marketRegime] = await Promise.all([
    getUniverseSnapshot({ forceRefresh }),
    getMarketRegime({ forceRefresh })
  ]);

  const feedbackBySymbol = getLatestSetupFeedbackBySymbol();
  const records = buildMinerviniPresetRecords(stocks, config, marketRegime, feedbackBySymbol);
  const presets = getMinerviniPresetDefinitions().map((preset) => {
    const candidates = buildPresetCandidatesById(preset.id, records, config).slice(0, preset.limit);
    return {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      count: candidates.length,
      symbols: candidates.map((item) => item.symbol),
      preview: candidates.slice(0, 5).map((item) => ({
        symbol: item.symbol,
        score: item.totalScore,
        setupType: item.setupType,
        tags: (item.tags || []).slice(0, 6),
        rs: item.metrics.rs,
        revenueGrowth: item.metrics.revenueGrowth,
        epsGrowth: item.metrics.epsGrowth
      }))
    };
  });

  recordSetupSnapshotsFromEvaluations(records, marketRegime);

  return {
    generatedAt: new Date().toISOString(),
    marketRegime,
    presets
  };
}

// Endpoint para aplicar filtros a TODAS las acciones del mercado
app.post('/api/screen', async (req, res) => {
  try {
    const filters = req.body || {};
    console.log(`[SCREEN] Screening de TODAS las acciones del mercado con filtros:`);
    console.log(`   minPrice: ${filters.minPrice} (tipo: ${typeof filters.minPrice})`);
    console.log(`   maxPrice: ${filters.maxPrice} (tipo: ${typeof filters.maxPrice})`);
    console.log(`   minRS: ${filters.minRS}`);
    console.log(`   maxRS: ${filters.maxRS}`);
    console.log(`   aboveSMA50: ${filters.aboveSMA50} (tipo: ${typeof filters.aboveSMA50})`);
    console.log(`   aboveSMA150: ${filters.aboveSMA150} (tipo: ${typeof filters.aboveSMA150})`);
    console.log(`   aboveSMA200: ${filters.aboveSMA200} (tipo: ${typeof filters.aboveSMA200})`);
    console.log(`   epsGrowthMin: ${filters.epsGrowthMin}`);
    console.log(`   revenueGrowthMin: ${filters.revenueGrowthMin}`);
    console.log(`   grossMarginMin: ${filters.grossMarginMin}`);
    console.log(`   operatingMarginMin: ${filters.operatingMarginMin}`);
    console.log(`   netMarginMin: ${filters.netMarginMin}`);
    console.log(`   requireFundamentals: ${filters.requireFundamentals}`);
    console.log(`   Filtros completos:`, JSON.stringify(filters));

    const SYMBOLS_SOURCE = (ALL_US_SYMBOLS && ALL_US_SYMBOLS.length > 0) ? ALL_US_SYMBOLS : ALL_STOCKS;
    const totalSymbols = SYMBOLS_SOURCE.length;
    console.log(`[SCREEN] Universo completo: ${totalSymbols} simbolos`);
    console.log(`   Ejemplos: ${SYMBOLS_SOURCE.slice(0, 3).join(', ')}`);

    const fetchedStocks = [];
    const TV_BATCH = 100;
    const needsFreshData = Boolean(
      filters.aboveSMA50 ||
      filters.aboveSMA150 ||
      filters.aboveSMA200 ||
      filters.aboveEMA20 ||
      filters.aboveEMA50
    );

    if (needsFreshData) {
      console.log('[SCREEN] Limpiando cache de TradingView para obtener datos frescos...');
      tradingViewCache.data = {};
      tradingViewCache.timestamps = {};
    }

    for (let i = 0; i < totalSymbols; i += TV_BATCH) {
      const batch = SYMBOLS_SOURCE.slice(i, i + TV_BATCH);
      const normalizedBatch = batch
        .map((sym) => {
          if (!sym) return null;
          if (typeof sym === 'string') return sym;
          if (typeof sym === 'object' && sym !== null && sym.symbol) return String(sym.symbol);
          return String(sym);
        })
        .filter(Boolean);

      if (normalizedBatch.length === 0) continue;

      console.log(`   [SCREEN] TradingView batch ${i / TV_BATCH + 1}: ${normalizedBatch.length} simbolos`);
      const data = await getTradingViewData(normalizedBatch, { forceRefresh: needsFreshData });
      const returnedSymbols = new Set(data.map((item) => item.symbol));
      fetchedStocks.push(...data);

      const missing = normalizedBatch.filter((sym) => !returnedSymbols.has(sym));
      if (missing.length > 0) {
        console.log(`   [SCREEN] TradingView no devolvio datos para: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ` (+${missing.length - 5})` : ''}`);
      }

      console.log(`[SCREEN] Progreso descarga: ${Math.min(i + TV_BATCH, totalSymbols)}/${totalSymbols} | Datos recibidos: ${fetchedStocks.length}`);

      if (i + TV_BATCH < totalSymbols) {
        await delay(200);
      }
    }

    if (fetchedStocks.length === 0) {
      console.warn('[SCREEN] No se obtuvieron datos para screening');
      return res.json([]);
    }

    const stocksWithScores = fetchedStocks
      .filter((stock) => stock.rsScore !== null && !Number.isNaN(stock.rsScore))
      .map((stock) => ({
        symbol: stock.symbol,
        score: stock.rsScore,
        quarters: stock.rsQuarters || {}
      }));

    if (stocksWithScores.length > 0) {
      const ratings = calculatePreciseRSRatings(stocksWithScores, { onStats: logRSRatingStats });
      if (Object.keys(ratings).length > 0) {
        rsRatingCache.data = ratings;
        rsRatingCache.lastCalculation = Date.now();
        fetchedStocks.forEach((stock) => {
          const rsData = ratings[stock.symbol];
          if (rsData) {
            stock.relativeStrength = rsData.rating;
            stock.rsScore = rsData.score;
            stock.rsRank = rsData.rank;
          }
        });
      }
    }

    const screenWithFundamentals = addFundamentalsSummaryToStocks(fetchedStocks);
    const missingCoverageSymbols = screenWithFundamentals
      .filter((stock) => !stock.fundamentals || stock.fundamentals.coverage === 'missing')
      .map((stock) => stock.symbol);

    if (missingCoverageSymbols.length > 0) {
      queueFundamentalsSync(missingCoverageSymbols);
    }

    const [screenMarketRegime, setupConfig] = await Promise.all([
      getMarketRegime({ forceRefresh: needsFreshData }),
      Promise.resolve(loadMinerviniConfig())
    ]);
    const feedbackBySymbol = getLatestSetupFeedbackBySymbol();
    const { stocks: setupEnrichedUniverse, evaluations: setupEvaluations } = applySetupProfilesToStocks(
      screenWithFundamentals,
      screenMarketRegime,
      setupConfig,
      feedbackBySymbol
    );
    recordSetupSnapshotsFromEvaluations(setupEvaluations, screenMarketRegime);

    const results = [];
    let rejectedNoSMA = 0;
    let rejectedPriceBelowSMA = 0;
    let rejectedByRS = 0;
    let rejectedByFundamentals = 0;

    for (const stock of setupEnrichedUniverse) {
      const passes = matchesFilters(stock, filters);
      if (passes) {
        results.push(stock);
      } else {
        if ((filters.aboveSMA50 && stock.sma50 <= 0) ||
            (filters.aboveSMA150 && stock.sma150 <= 0) ||
            (filters.aboveSMA200 && stock.sma200 <= 0)) {
          rejectedNoSMA += 1;
        } else if ((filters.aboveSMA50 && stock.price <= stock.sma50) ||
                   (filters.aboveSMA150 && stock.price <= stock.sma150) ||
                   (filters.aboveSMA200 && stock.price <= stock.sma200)) {
          rejectedPriceBelowSMA += 1;
        } else if ((filters.minRS !== undefined && filters.minRS !== null && stock.relativeStrength < filters.minRS) ||
                   (filters.maxRS !== undefined && filters.maxRS !== null && stock.relativeStrength > filters.maxRS)) {
          rejectedByRS += 1;
        } else if (hasFundamentalFilters(filters)) {
          rejectedByFundamentals += 1;
        }
      }
    }

    if (results.length > 0) {
      const sample = results[0];
      console.log(`   [SCREEN] Aprobada: ${sample.symbol} - Precio: $${sample.price.toFixed(2)}, RS: ${sample.relativeStrength}`);
    }

    console.log(`\n[SCREEN] Screening completado: ${results.length} acciones cumplen los criterios`);
    console.log(`   Descargadas: ${fetchedStocks.length}`);
    console.log(`   Rechazadas por SMA faltante: ${rejectedNoSMA}`);
    console.log(`   Rechazadas por precio bajo medias: ${rejectedPriceBelowSMA}`);
    console.log(`   Rechazadas por RS: ${rejectedByRS}`);
    console.log(`   Rechazadas por fundamentales: ${rejectedByFundamentals}`);
    console.log(`   RS ratings disponibles: ${Object.keys(rsRatingCache.data).length}/${totalSymbols}`);
    console.log(`   Fundamentales frescos cacheados: ${Object.keys(fundamentalsCache.timestamps).filter((symbol) => getFundamentalsAgeMs(symbol) <= FUNDAMENTALS_CACHE_DURATION).length}`);

    res.json(results);
  } catch (error) {
    console.error('[SCREEN] Error en screening:', error.message);
    res.status(500).json({ error: 'Error al realizar screening' });
  }
});

// Funcion para verificar si una accion cumple los filtros
function matchesFilters(stock, filters) {
  // Filtro de precio mínimo

  if (filters.minPrice !== undefined && filters.minPrice !== null && !isNaN(filters.minPrice)) {

    if (stock.price < filters.minPrice) {

      return false;

    }

  }



  // Filtro de precio máximo

  if (filters.maxPrice !== undefined && filters.maxPrice !== null && !isNaN(filters.maxPrice)) {

    if (stock.price > filters.maxPrice) {

      return false;

    }

  }



  // Filtro de RS mínimo

  if (filters.minRS !== undefined && filters.minRS !== null && !isNaN(filters.minRS)) {

    if (stock.relativeStrength < filters.minRS) {

      return false;

    }

  }



  // Filtro de RS máximo

  if (filters.maxRS !== undefined && filters.maxRS !== null && !isNaN(filters.maxRS)) {

    if (stock.relativeStrength > filters.maxRS) {

      return false;

    }

  }



  // Filtro de cambio de precio mínimo

  if (filters.priceChangeMin !== undefined && filters.priceChangeMin !== null && !isNaN(filters.priceChangeMin)) {

    if (stock.changePercent < filters.priceChangeMin) {

      return false;

    }

  }



  // Filtro de cambio de precio máximo

  if (filters.priceChangeMax !== undefined && filters.priceChangeMax !== null && !isNaN(filters.priceChangeMax)) {

    if (stock.changePercent > filters.priceChangeMax) {

      return false;

    }

  }



  // Filtro de volumen mínimo (en millones)

  if (filters.minVolume !== undefined && filters.minVolume !== null && !isNaN(filters.minVolume)) {

    if ((stock.volume / 1000000) < filters.minVolume) {

      return false;

    }

  }



  // Filtro por encima de SMA 50

  if (filters.aboveSMA50 === true) {

    // Solo aplicar filtro si tenemos datos válidos de SMA50

    if (stock.sma50 > 0) {

      if (stock.price <= stock.sma50) {

        return false;

      }

    } else {

      // Si no hay datos de SMA50, excluir la acción

      return false;

    }

  }



  // Filtro por encima de SMA 150

  if (filters.aboveSMA150 === true) {

    // Solo aplicar filtro si tenemos datos válidos de SMA150

    if (stock.sma150 > 0) {

      if (stock.price <= stock.sma150) {

        return false;

      }

    } else {

      // Si no hay datos de SMA150, excluir la acción

      return false;

    }

  }



  // Filtro por encima de SMA 200

  if (filters.aboveSMA200 === true) {

    // Solo aplicar filtro si tenemos datos válidos de SMA200

    if (stock.sma200 > 0) {

      if (stock.price <= stock.sma200) {

        return false;

      }

    } else {

      // Si no hay datos de SMA200, excluir la acción

      return false;

    }

  }



  // Filtro por encima de EMA 20

  if (filters.aboveEMA20 === true) {

    if (stock.ema20 > 0) {

      if (stock.price <= stock.ema20) {

        return false;

      }

    } else {

      return false;

    }

  }



  // Filtro por encima de EMA 50

  if (filters.aboveEMA50 === true) {
    if (stock.ema50 > 0) {
      if (stock.price <= stock.ema50) {
        return false;
      }
    } else {

      return false;

    }
  }

  const fundamentals = stock.fundamentals || null;
  const hasFundamentals = Boolean(fundamentals && fundamentals.hasFundamentals);

  if (filters.requireFundamentals === true && !hasFundamentals) {
    return false;
  }

  if (filters.epsGrowthMin !== undefined && filters.epsGrowthMin !== null && !isNaN(filters.epsGrowthMin)) {
    if (!hasFundamentals || !Number.isFinite(fundamentals.epsGrowth) || fundamentals.epsGrowth < filters.epsGrowthMin) {
      return false;
    }
  }

  if (filters.revenueGrowthMin !== undefined && filters.revenueGrowthMin !== null && !isNaN(filters.revenueGrowthMin)) {
    if (!hasFundamentals || !Number.isFinite(fundamentals.revenueGrowth) || fundamentals.revenueGrowth < filters.revenueGrowthMin) {
      return false;
    }
  }

  if (filters.grossMarginMin !== undefined && filters.grossMarginMin !== null && !isNaN(filters.grossMarginMin)) {
    if (!hasFundamentals || !Number.isFinite(fundamentals.grossMargin) || fundamentals.grossMargin < filters.grossMarginMin) {
      return false;
    }
  }

  if (filters.operatingMarginMin !== undefined && filters.operatingMarginMin !== null && !isNaN(filters.operatingMarginMin)) {
    if (!hasFundamentals || !Number.isFinite(fundamentals.operatingMargin) || fundamentals.operatingMargin < filters.operatingMarginMin) {
      return false;
    }
  }

  if (filters.netMarginMin !== undefined && filters.netMarginMin !== null && !isNaN(filters.netMarginMin)) {
    if (!hasFundamentals || !Number.isFinite(fundamentals.netMargin) || fundamentals.netMargin < filters.netMarginMin) {
      return false;
    }
  }

  return true;
}


// Endpoint principal: obtener datos de múltiples acciones

app.get('/api/stocks', async (req, res) => {
  try {
    const requestedMode = String(req.query.mode || 'all');
    const requestedSymbols = String(req.query.symbols || '')
      .split(',')
      .map((symbol) => String(symbol || '').trim().toUpperCase())
      .filter(Boolean);
    const mode = requestedMode === 'default' ? 'all' : requestedMode; // all, indices

    let symbols = [];
    let totalSymbols = 0;
    let effectiveMode = mode;

    // Priorizar symbols explícitos para watchlists y refresh de un símbolo
    if (requestedSymbols.length > 0) {
      symbols = requestedSymbols;
      totalSymbols = symbols.length;
      effectiveMode = 'symbols';
    } else if (mode === 'all') {

      // TODAS las acciones del mercado de EEUU (sin paginación)

      if (ALL_US_SYMBOLS.length > 0) {

        symbols = ALL_US_SYMBOLS;

        totalSymbols = symbols.length;

        console.log(`[modo] Modo: ${mode} | Cargando TODAS las ${totalSymbols} acciones válidas del mercado`);
      } else {

        symbols = ALL_STOCKS; // Fallback a lista reducida

        totalSymbols = symbols.length;

        console.log(`[modo] Modo: ${mode} | Usando lista reducida: ${symbols.length} símbolos`);
      }

    } else if (mode === 'indices') {

      symbols = MARKET_INDICES;

      totalSymbols = symbols.length;

    } else {
      // Fallback: universo completo de acciones reales
      if (ALL_US_SYMBOLS.length > 0) {
        symbols = ALL_US_SYMBOLS;
        totalSymbols = symbols.length;
      } else {
        symbols = ALL_STOCKS;
        totalSymbols = symbols.length;
      }
      console.log(`[modo] Modo fallback -> universo completo: ${totalSymbols} símbolos`);
    }

    console.log(`[modo] Modo: ${effectiveMode} | Símbolos a procesar: ${symbols.length}`);
    const snapshotToken = universeSnapshotCache.token;

    const enrichedData = effectiveMode === 'all'
      ? await getUniverseSnapshot({ forceRefresh: false })
      : addFundamentalsAndQueueMissing(applyRSRatingsToStocks(
          await getTradingViewData(symbols, { forceRefresh: false })
        ));

    const [marketRegime, setupConfig] = await Promise.all([
      getMarketRegime({ forceRefresh: false }),
      Promise.resolve(loadMinerviniConfig())
    ]);
    const feedbackBySymbol = getLatestSetupFeedbackBySymbol();
    const { stocks: setupEnrichedData, evaluations: setupEvaluations } = applySetupProfilesToStocks(
      enrichedData,
      marketRegime,
      setupConfig,
      feedbackBySymbol
    );
    recordSetupSnapshotsFromEvaluations(setupEvaluations, marketRegime);

    if (effectiveMode === 'all') {
      if (universeSnapshotCache.token === snapshotToken) {
        universeSnapshotCache.data = setupEnrichedData;
        universeSnapshotCache.timestamp = Date.now();
      }
      console.log(`[modo] Universo completo cargado: ${setupEnrichedData.length} acciones`);
      console.log(`   Incluye: ${setupEnrichedData.slice(0, 5).map(s => s.symbol).join(', ')}...`);
    }

    console.log(`[modo] TradingView devolvió ${setupEnrichedData.length} acciones finales`);

    // Enviar respuesta sin paginación
    res.json({
      data: setupEnrichedData,
      total: totalSymbols,
      marketRegime: {
        state: marketRegime.state,
        score: marketRegime.score,
        generatedAt: marketRegime.generatedAt
      }
    });
  } catch (error) {

    console.error('[error] Error en /api/stocks:', error);
    res.status(500).json({ error: 'Error fetching stock data' });

  }
});

app.get('/api/minervini/config', (req, res) => {
  res.json(loadMinerviniConfig());
});

app.get('/api/minervini/presets', async (req, res) => {
  try {
    const forceRefresh = String(req.query.forceRefresh || '').toLowerCase() === 'true';
    const payload = await buildMinerviniPresetLists({ forceRefresh });
    res.json(payload);
  } catch (error) {
    console.error('❌ Error en /api/minervini/presets:', error.message);
    res.status(500).json({ error: 'Error building Minervini preset lists' });
  }
});

app.get('/api/minervini/presets/:presetId', async (req, res) => {
  try {
    const forceRefresh = String(req.query.forceRefresh || '').toLowerCase() === 'true';
    const payload = await buildMinerviniPresetLists({ forceRefresh });
    const preset = payload.presets.find((item) => item.id === req.params.presetId);

    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    res.json({
      generatedAt: payload.generatedAt,
      marketRegime: payload.marketRegime,
      preset
    });
  } catch (error) {
    console.error(`❌ Error en /api/minervini/presets/${req.params.presetId}:`, error.message);
    res.status(500).json({ error: 'Error building Minervini preset list' });
  }
});

app.get('/api/minervini/diagnostics', async (req, res) => {
  try {
    const forceRefresh = String(req.query.forceRefresh || '').toLowerCase() === 'true';
    const report = await buildMinerviniDailyReport({ forceRefresh, limit: 1 });
    res.json({
      generatedAt: report.generatedAt,
      marketRegime: report.marketRegime,
      diagnostics: report.diagnostics
    });
  } catch (error) {
    console.error('❌ Error en /api/minervini/diagnostics:', error.message);
    res.status(500).json({ error: 'Error building Minervini diagnostics' });
  }
});

app.get('/api/minervini/shortlist', async (req, res) => {
  try {
    const forceRefresh = String(req.query.forceRefresh || '').toLowerCase() === 'true';
    const limit = Number.isFinite(Number(req.query.limit)) ? Number(req.query.limit) : null;
    const report = await buildMinerviniDailyReport({ forceRefresh, limit });
    res.json(report);
  } catch (error) {
    console.error('❌ Error en /api/minervini/shortlist:', error.message);
    res.status(500).json({ error: 'Error building Minervini shortlist' });
  }
});

app.get('/api/setups/analytics', (req, res) => {
  try {
    const horizonsRaw = String(req.query.horizons || '5,10,20')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
    const minSamples = Number.isFinite(Number(req.query.minSamples))
      ? Number(req.query.minSamples)
      : 15;

    const analytics = buildSetupTagAnalytics({
      horizons: horizonsRaw.length > 0 ? horizonsRaw : [5, 10, 20],
      minSamples: Math.max(1, minSamples)
    });

    res.json(analytics);
  } catch (error) {
    console.error('Error in /api/setups/analytics:', error.message);
    res.status(500).json({ error: 'Error building setup analytics' });
  }
});

app.get('/api/setups/feedback', (req, res) => {
  try {
    const symbol = req.query.symbol ? String(req.query.symbol).trim().toUpperCase() : null;
    const limit = Number.isFinite(Number(req.query.limit)) ? Number(req.query.limit) : 200;
    const entries = listSetupFeedbackEntries({ symbol, limit });

    res.json({
      count: entries.length,
      entries
    });
  } catch (error) {
    console.error('Error in /api/setups/feedback:', error.message);
    res.status(500).json({ error: 'Error loading setup feedback' });
  }
});

app.post('/api/setups/feedback', (req, res) => {
  try {
    const body = req.body || {};
    const entry = upsertSetupFeedbackEntry({
      symbol: body.symbol,
      date: body.date,
      verdict: body.verdict,
      tags: body.tags,
      notes: body.notes
    });

    res.json({
      status: 'ok',
      entry
    });
  } catch (error) {
    const status = /symbol is required/i.test(String(error.message || '')) ? 400 : 500;
    res.status(status).json({ error: error.message || 'Error saving setup feedback' });
  }
});
// Endpoint para calcular RS Ratings del universo completo
app.post('/api/calculate-rs-ratings', async (req, res) => {
  try {

    if (rsRatingCache.isCalculating) {

      return res.json({

        status: 'calculating',

        message: 'RS Rating calculation already in progress'

      });

    }



    // Verificar si el cache es reciente (< 24 horas)

    if (rsRatingCache.lastCalculation &&

        (Date.now() - rsRatingCache.lastCalculation) < RS_CACHE_DURATION) {

      return res.json({

        status: 'cached',

        message: 'RS Ratings are up to date',

        lastCalculation: new Date(rsRatingCache.lastCalculation).toISOString(),

        stocksRated: Object.keys(rsRatingCache.data).length

      });

    }



    rsRatingCache.isCalculating = true;

    console.log('\n[RS] Starting RS Rating calculation for entire universe...');


    // Obtener datos de todas las acciones

    const allSymbols = ALL_US_SYMBOLS.length > 0 ? ALL_US_SYMBOLS : ALL_STOCKS;

    console.log(`[RS] Analyzing ${allSymbols.length} stocks...`);


    // Obtener datos de TradingView (esto puede tomar varios minutos)

    const stockData = await getTradingViewData(allSymbols, { forceRefresh: true });



    // Preparar array para calcular ratings

    const stocksWithScores = [];

    Object.values(stockData).forEach(stock => {

      if (stock.rsScore !== null && !isNaN(stock.rsScore)) {

        stocksWithScores.push({

          symbol: stock.symbol,

          score: stock.rsScore,

          quarters: stock.rsQuarters || {}

        });

      }

    });



    // Calcular RS Ratings (percentiles 1-99)

    const ratings = calculatePreciseRSRatings(stocksWithScores, { onStats: logRSRatingStats });


    // Actualizar cache

    rsRatingCache.data = ratings;

    rsRatingCache.lastCalculation = Date.now();

    rsRatingCache.isCalculating = false;



    console.log(`[RS] RS Rating calculation complete!`);
    console.log(`   Stocks rated: ${Object.keys(ratings).length}`);

    console.log(`   Cache valid until: ${new Date(rsRatingCache.lastCalculation + RS_CACHE_DURATION).toISOString()}\n`);



    res.json({

      status: 'success',

      stocksRated: Object.keys(ratings).length,

      lastCalculation: new Date(rsRatingCache.lastCalculation).toISOString(),

      topPerformers: Object.entries(ratings)

        .sort((a, b) => b[1].rating - a[1].rating)

        .slice(0, 10)

        .map(([symbol, data]) => ({

          symbol,

          rating: data.rating,

          score: data.score.toFixed(2),

          quarters: data.quarters

        }))

    });



  } catch (error) {

    rsRatingCache.isCalculating = false;

    console.error('[error] Error calculating RS Ratings:', error);
    res.status(500).json({ error: 'Error calculating RS Ratings' });

  }

});



// Endpoint para obtener RS Rating de símbolos específicos

app.get('/api/rs-rating/:symbol', (req, res) => {

  const { symbol } = req.params;

  const rating = rsRatingCache.data[symbol];



  if (!rating) {

    return res.status(404).json({

      error: 'RS Rating not found',

      message: 'Run /api/calculate-rs-ratings first or wait for automatic calculation'

    });

  }



  res.json({

    symbol,

    rating: rating.rating,

    score: rating.score,

    quarters: rating.quarters,

    rank: rating.rank,

    calculatedAt: new Date(rating.timestamp).toISOString()

  });

});



function normalizeMetricKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function roundTo(value, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function safeGrowth(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return 0;
  }
  return roundTo(((current - previous) / Math.abs(previous)) * 100, 1);
}

function parseDateOrNull(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCalendarQuarter(date) {
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

function getPeriodDays(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const diffMs = endDate.getTime() - startDate.getTime();
  if (!Number.isFinite(diffMs)) return null;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function pickMetricValue(items, conceptTokens = []) {
  if (!Array.isArray(items) || items.length === 0) return null;

  for (const token of conceptTokens) {
    for (const item of items) {
      const value = Number(item && item.value);
      if (!Number.isFinite(value)) continue;
      const concept = normalizeMetricKey(item && item.concept);
      if (concept.includes(token)) {
        return value;
      }
    }
  }

  return null;
}

function deriveQuarterMetric(records, sourceField, targetField) {
  const previousRawByFiscalYear = new Map();

  records.forEach((record) => {
    const rawValue = record[sourceField];
    if (!Number.isFinite(rawValue)) {
      record[targetField] = null;
      return;
    }

    const fiscalYearKey = Number.isFinite(record.fiscalYear) ? record.fiscalYear : record.calendarYear;
    const quarterIndex = Number.isFinite(record.fiscalQuarter) ? record.fiscalQuarter : record.calendarQuarter;
    const previousRaw = previousRawByFiscalYear.get(fiscalYearKey);

    if (record.isCumulative && quarterIndex > 1 && Number.isFinite(previousRaw)) {
      const quarterValue = rawValue - previousRaw;
      record[targetField] = Number.isFinite(quarterValue) ? quarterValue : rawValue;
    } else {
      record[targetField] = rawValue;
    }

    previousRawByFiscalYear.set(fiscalYearKey, rawValue);
  });
}

function deriveQuarterEPS(records) {
  const previousRawEpsByFiscalYear = new Map();

  records.forEach((record) => {
    const fiscalYearKey = Number.isFinite(record.fiscalYear) ? record.fiscalYear : record.calendarYear;
    const quarterIndex = Number.isFinite(record.fiscalQuarter) ? record.fiscalQuarter : record.calendarQuarter;
    const previousRawEps = previousRawEpsByFiscalYear.get(fiscalYearKey);
    let eps = Number.isFinite(record.epsRaw) ? record.epsRaw : null;

    if (
      record.isCumulative &&
      quarterIndex > 1 &&
      Number.isFinite(record.epsRaw) &&
      Number.isFinite(previousRawEps)
    ) {
      const quarterEps = record.epsRaw - previousRawEps;
      eps = Number.isFinite(quarterEps) ? quarterEps : record.epsRaw;
    }

    if (!Number.isFinite(eps) || Math.abs(eps) < 0.0001) {
      const shares = Number.isFinite(record.dilutedSharesRaw) && record.dilutedSharesRaw > 0
        ? record.dilutedSharesRaw
        : record.basicSharesRaw;
      if (Number.isFinite(record.netIncome) && Number.isFinite(shares) && shares > 0) {
        eps = record.netIncome / shares;
      }
    }

    record.eps = Number.isFinite(eps) ? eps : null;
    previousRawEpsByFiscalYear.set(fiscalYearKey, record.epsRaw);
  });
}

function toFundamentalRecord(entry) {
  const endDate = parseDateOrNull(entry && entry.endDate);
  if (!endDate) return null;

  const now = new Date();
  if (endDate.getTime() > now.getTime()) {
    return null;
  }

  const startDate = parseDateOrNull(entry && entry.startDate);
  const periodDays = getPeriodDays(startDate, endDate);
  const fiscalQuarterRaw = Number(entry && entry.quarter);
  const fiscalYearRaw = Number(entry && entry.year);
  const acceptedDate = parseDateOrNull(
    entry && (entry.acceptedDate || entry.filedDate || entry.endDate)
  );
  const acceptedDateMs = acceptedDate ? acceptedDate.getTime() : 0;

  const incomeStatement = Array.isArray(entry && entry.report && entry.report.ic)
    ? entry.report.ic
    : [];

  const fiscalQuarter = Number.isFinite(fiscalQuarterRaw) && fiscalQuarterRaw >= 1 && fiscalQuarterRaw <= 4
    ? fiscalQuarterRaw
    : null;
  const fiscalYear = Number.isFinite(fiscalYearRaw) ? fiscalYearRaw : null;
  const calendarQuarter = getCalendarQuarter(endDate);
  const calendarYear = endDate.getUTCFullYear();
  const periodEnd = toISODate(endDate);
  if (!periodEnd) return null;

  const isCumulative = fiscalQuarterRaw === 0 || (Number.isFinite(periodDays) && periodDays > 120);

  return {
    periodEnd,
    periodEndMs: endDate.getTime(),
    reportedDate: acceptedDate ? toISODate(acceptedDate) : null,
    acceptedDateMs,
    fiscalYear,
    fiscalQuarter,
    calendarYear,
    calendarQuarter,
    isCumulative,
    revenueRaw: pickMetricValue(incomeStatement, [
      'revenuefromcontractwithcustomerexcludingassessedtax',
      'salesrevenuenet',
      'totalrevenue',
      'revenuesnetofinterestexpense',
      'operatingrevenues',
      'revenuesfromexternalcustomers',
      'revenues'
    ]),
    grossProfitRaw: pickMetricValue(incomeStatement, ['grossprofit']),
    operatingIncomeRaw: pickMetricValue(incomeStatement, ['operatingincomeloss']),
    netIncomeRaw: pickMetricValue(incomeStatement, [
      'netincomelossavailabletocommonstockholdersdiluted',
      'netincomelossavailabletocommonstockholdersbasic',
      'netincomeloss'
    ]),
    epsRaw: pickMetricValue(incomeStatement, [
      'earningspersharediluted',
      'earningspersharebasicanddiluted',
      'earningspersharebasic',
      'basicanddilutedearningspershare'
    ]),
    dilutedSharesRaw: pickMetricValue(incomeStatement, [
      'weightedaveragenumberofdilutedsharesoutstanding',
      'weightedaveragenumberofdilutedshares'
    ]),
    basicSharesRaw: pickMetricValue(incomeStatement, [
      'weightedaveragenumberofsharesoutstandingbasic',
      'weightedaveragenumberofsharesoutstanding'
    ])
  };
}

function parseQuarterlyFundamentals(entries = []) {
  const byPeriodEnd = new Map();

  entries.forEach((entry) => {
    const record = toFundamentalRecord(entry);
    if (!record) return;

    const existing = byPeriodEnd.get(record.periodEnd);
    if (!existing || record.acceptedDateMs >= existing.acceptedDateMs) {
      byPeriodEnd.set(record.periodEnd, record);
    }
  });

  const records = Array.from(byPeriodEnd.values()).sort((a, b) => a.periodEndMs - b.periodEndMs);
  if (records.length === 0) {
    return [];
  }

  deriveQuarterMetric(records, 'revenueRaw', 'revenue');
  deriveQuarterMetric(records, 'grossProfitRaw', 'grossProfit');
  deriveQuarterMetric(records, 'operatingIncomeRaw', 'operatingIncome');
  deriveQuarterMetric(records, 'netIncomeRaw', 'netIncome');
  deriveQuarterEPS(records);

  const previousYearByCalendarQuarter = new Map();
  records.forEach((record) => {
    previousYearByCalendarQuarter.set(
      `${record.calendarYear}-Q${record.calendarQuarter}`,
      record
    );
  });

  const quarterlyData = records
    .map((record) => {
      const previous = previousYearByCalendarQuarter.get(
        `${record.calendarYear - 1}-Q${record.calendarQuarter}`
      );

      const revenue = Number.isFinite(record.revenue) ? record.revenue : 0;
      const grossProfit = Number.isFinite(record.grossProfit) ? record.grossProfit : 0;
      const operatingIncome = Number.isFinite(record.operatingIncome) ? record.operatingIncome : 0;
      const netIncome = Number.isFinite(record.netIncome) ? record.netIncome : 0;
      const eps = Number.isFinite(record.eps) ? record.eps : 0;

      const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const operatingMargin = revenue > 0 ? (operatingIncome / revenue) * 100 : 0;
      const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

      return {
        quarter: `Q${record.calendarQuarter}`,
        year: record.calendarYear,
        periodEnd: record.periodEnd,
        reportedDate: record.reportedDate,
        fiscalYear: record.fiscalYear,
        fiscalQuarter: record.fiscalQuarter,
        eps: roundTo(eps, 2),
        epsGrowth: safeGrowth(eps, previous && previous.eps),
        revenue: roundTo(revenue, 0),
        revenueGrowth: safeGrowth(revenue, previous && previous.revenue),
        grossMargin: roundTo(grossMargin, 1),
        operatingMargin: roundTo(operatingMargin, 1),
        netMargin: roundTo(netMargin, 1)
      };
    })
    .filter((item) => item.eps !== 0 || item.revenue !== 0)
    .slice(-12);

  return quarterlyData;
}

// Endpoint para datos fundamentales
app.get('/api/fundamentals/:symbol', async (req, res) => {
  const symbol = String((req.params && req.params.symbol) || '').trim().toUpperCase();
  if (!symbol) {
    return res.status(400).json({ error: 'Invalid symbol' });
  }

  if (!FINNHUB_API_KEY) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY is not configured' });
  }

  const cached = getCachedFundamentalsPayload(symbol, { allowStale: false });
  if (cached) {
    return res.json(cached);
  }

  try {
    const payload = await getOrFetchFundamentals(symbol, { forceRefresh: true });
    if (!payload || !Array.isArray(payload.quarterlyData) || payload.quarterlyData.length === 0) {
      return res.status(404).json({
        error: 'No quarterly fundamentals available for this symbol'
      });
    }
    return res.json(payload);
  } catch (error) {
    console.error('Error fetching fundamentals for ' + symbol + ':', error.message);
    const statusCode = (error.response && error.response.status) || 500;
    return res.status(statusCode).json({ error: 'Error fetching fundamentals' });
  }
});

app.get('/api/fundamentals/sync/status', (req, res) => {
  const universeSize = getUniverseSymbols().length;
  const cachedCount = Object.keys(fundamentalsCache.data).length;
  const freshCount = Object.keys(fundamentalsCache.timestamps).filter(
    (symbol) => getFundamentalsAgeMs(symbol) <= FUNDAMENTALS_CACHE_DURATION
  ).length;

  res.json({
    status: fundamentalsSyncState.isRunning ? 'running' : 'idle',
    universeSize,
    cachedCount,
    freshCount,
    coveragePercent: universeSize > 0 ? Number(((freshCount / universeSize) * 100).toFixed(2)) : 0,
    queueLength: fundamentalsSyncState.queue.length,
    processed: fundamentalsSyncState.processed,
    succeeded: fundamentalsSyncState.succeeded,
    missing: fundamentalsSyncState.missing,
    failed: fundamentalsSyncState.failed,
    totalPlanned: fundamentalsSyncState.totalPlanned,
    currentSymbol: fundamentalsSyncState.currentSymbol,
    startedAt: fundamentalsSyncState.startedAt,
    finishedAt: fundamentalsSyncState.finishedAt,
    lastFullSyncAt: fundamentalsCache.lastFullSyncAt,
    lastError: fundamentalsSyncState.lastError
  });
});

app.post('/api/fundamentals/sync', async (req, res) => {
  const body = req.body || {};
  const force = Boolean(body.force);
  const limit = Number.isFinite(Number(body.limit)) ? Number(body.limit) : null;
  const symbols = Array.isArray(body.symbols) ? body.symbols : null;

  const result = symbols && symbols.length > 0
    ? { queued: queueFundamentalsSync(symbols, { force }), universeSize: symbols.length, staleSymbols: symbols.length }
    : queueUniverseFundamentalsSync({ force, limit });

  return res.json({
    status: fundamentalsSyncState.isRunning ? 'running' : 'queued',
    ...result,
    queueLength: fundamentalsSyncState.queue.length
  });
});
// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cachedSymbols: Object.keys(tradingViewCache.data).length,

    dataSource: 'TradingView'

  });

});



// Endpoint para limpiar caché (útil para debugging)

app.post('/api/cache/clear', (req, res) => {
  const symbolsCleared = Object.keys(tradingViewCache.data).length;
  tradingViewCache.data = {};
  tradingViewCache.timestamps = {};
  universeSnapshotCache.data = null;
  universeSnapshotCache.timestamp = 0;
  universeSnapshotCache.inflight = null;
  universeSnapshotCache.token += 1;
  console.log(`[cache] Cach? de TradingView limpiado: ${symbolsCleared} símbolos eliminados`);
  res.json({
    message: 'TradingView cache cleared',
    symbolsCleared

  });

});



// Función auxiliar: nombres de acciones e índices

function getStockName(symbol) {

  const names = {

    // Tech Giants

    'AAPL': 'Apple Inc.',

    'MSFT': 'Microsoft Corporation',

    'GOOGL': 'Alphabet Inc.',

    'AMZN': 'Amazon.com Inc.',

    'NVDA': 'NVIDIA Corporation',

    'META': 'Meta Platforms Inc.',

    'TSLA': 'Tesla Inc.',

    'NFLX': 'Netflix Inc.',

    'INTC': 'Intel Corporation',

    'AMD': 'Advanced Micro Devices',

    'ORCL': 'Oracle Corporation',

    'CSCO': 'Cisco Systems',

    'ADBE': 'Adobe Inc.',

    'CRM': 'Salesforce Inc.',

    'AVGO': 'Broadcom Inc.',



    // Finance

    'BRK.B': 'Berkshire Hathaway',

    'JPM': 'JPMorgan Chase',

    'V': 'Visa Inc.',

    'MA': 'Mastercard Inc.',

    'BAC': 'Bank of America',

    'WFC': 'Wells Fargo',

    'C': 'Citigroup',

    'GS': 'Goldman Sachs',

    'MS': 'Morgan Stanley',

    'AXP': 'American Express',

    'SCHW': 'Charles Schwab',

    'BLK': 'BlackRock',

    'PNC': 'PNC Financial',

    'USB': 'U.S. Bancorp',



    // Consumer

    'WMT': 'Walmart Inc.',

    'PG': 'Procter & Gamble',

    'KO': 'Coca-Cola Company',

    'PEP': 'PepsiCo Inc.',

    'COST': 'Costco Wholesale',

    'HD': 'Home Depot',

    'LOW': 'Lowe\'s Companies',

    'MCD': 'McDonald\'s Corp',

    'NKE': 'Nike Inc.',

    'SBUX': 'Starbucks',

    'TGT': 'Target Corp',



    // Healthcare

    'JNJ': 'Johnson & Johnson',

    'UNH': 'UnitedHealth Group',

    'PFE': 'Pfizer Inc.',

    'ABBV': 'AbbVie Inc.',

    'TMO': 'Thermo Fisher',

    'ABT': 'Abbott Laboratories',

    'MRK': 'Merck & Co.',

    'LLY': 'Eli Lilly',



    // Energy

    'XOM': 'Exxon Mobil',

    'CVX': 'Chevron Corporation',

    'COP': 'ConocoPhillips',



    // Entertainment

    'DIS': 'Walt Disney',



    // Fintech & Growth

    'SHOP': 'Shopify Inc.',

    'SQ': 'Block Inc.',

    'PYPL': 'PayPal Holdings',

    'COIN': 'Coinbase Global',

    'ROKU': 'Roku Inc.',

    'UBER': 'Uber Technologies',

    'LYFT': 'Lyft Inc.',

    'ABNB': 'Airbnb Inc.',

    'RBLX': 'Roblox Corp',



    // Crypto

    'BTC-USD': 'Bitcoin USD',

    'ETH-USD': 'Ethereum USD',



    // índices (solo los esenciales)

    '^GSPC': 'S&P 500 Index',

    '^DJI': 'Dow Jones Industrial',

    '^IXIC': 'NASDAQ Composite',

    '^RUT': 'Russell 2000',

    '^VIX': 'CBOE Volatility Index',



    // ETFs más importantes

    'SPY': 'SPDR S&P 500 ETF',

    'QQQ': 'Invesco QQQ (NASDAQ-100)',

    'VOO': 'Vanguard S&P 500 ETF',



    // Sectoriales top

    'XLE': 'Energy Select Sector',

    'XLF': 'Financial Select Sector',

    'XLK': 'Technology Select Sector',



    // Bitcoin/Crypto

    'IBIT': 'iShares Bitcoin Trust',



    // Commodities

    'GLD': 'SPDR Gold Trust',

  };

  return names[symbol] || symbol;

}



// Función auxiliar: generar mock data como fallback

function generateMockStock(symbol) {

  const basePrice = Math.random() * 500 + 50;

  const changePercent = Math.random() * 10 - 5;

  const sma20 = basePrice * (0.98 + Math.random() * 0.04);

  const sma50 = basePrice * (0.96 + Math.random() * 0.04);

  const sma150 = basePrice * (0.94 + Math.random() * 0.05);

  const sma200 = basePrice * (0.92 + Math.random() * 0.06);

  const ema20 = basePrice * (0.985 + Math.random() * 0.03);

  const ema50 = basePrice * (0.97 + Math.random() * 0.03);



  return {

    symbol,

    name: getStockName(symbol),

    price: basePrice,

    prevClose: basePrice / (1 + changePercent / 100),

    changePercent,

    high: basePrice * 1.02,

    low: basePrice * 0.98,

    open: basePrice * 0.99,

    volume: Math.floor(Math.random() * 50000000) + 10000000,

    marketCap: basePrice * Math.floor(Math.random() * 10000000000),

    sma20,

    sma50,

    sma150,

    sma200,

    ema20,

    ema50,

    relativeStrength: calculateRS(changePercent),

    lastUpdate: new Date().toISOString()

  };

}



// Función para calcular RS Ratings en background

async function calculateRSRatingsBackground() {

  if (rsRatingCache.isCalculating) {

    console.log('[RS] RS Rating calculation already in progress, skipping...');
    return;

  }



  try {

    rsRatingCache.isCalculating = true;

    console.log('\n[RS] [Background] Starting RS Rating calculation...');


    // Calcular para todas las acciones (esto puede tomar varios minutos)

    const allSymbols = ALL_US_SYMBOLS.length > 0 ? ALL_US_SYMBOLS : SP500_STOCKS;

    console.log(`[RS] Analyzing ALL ${allSymbols.length} stocks...`);
    console.log('   This may take 5-10 minutes depending on TradingView API...');


    const stockData = await getTradingViewData(allSymbols, { forceRefresh: false });



    const stocksWithScores = [];

    Object.values(stockData).forEach(stock => {

      if (stock.rsScore !== null && !isNaN(stock.rsScore)) {

        stocksWithScores.push({

          symbol: stock.symbol,

          score: stock.rsScore,

          quarters: stock.rsQuarters || {}

        });

      }

    });



    const ratings = calculatePreciseRSRatings(stocksWithScores, { onStats: logRSRatingStats });


    rsRatingCache.data = ratings;

    rsRatingCache.lastCalculation = Date.now();

    rsRatingCache.isCalculating = false;



    console.log(`[RS] RS Rating calculation complete!`);
    console.log(`   Stocks rated: ${Object.keys(ratings).length}`);

    console.log(`   Next calculation in 24 hours\n`);



  } catch (error) {

    rsRatingCache.isCalculating = false;

    console.error('[error] Error calculating RS Ratings in background:', error.message);
  }

}



// Servir archivos estáticos del frontend

app.use(express.static(join(__dirname, 'dist')));



// Ruta catch-all para SPA

app.get('*', (req, res) => {

  res.sendFile(join(__dirname, 'dist', 'index.html'));

});



app.listen(PORT, () => {
  console.log(`\n[server] Stock Data Server running on http://localhost:${PORT}`);
  console.log(`[server] Tracking ${STOCK_SYMBOLS.length} real stocks`);
  console.log(`[server] TradingView cache: ${TV_CACHE_DURATION / 1000}s`);
  console.log(`[server] Data source: TradingView Scanner API`);
  console.log(`[server] RS Rating methodology: William O'Neil CAN SLIM\n`);


  // Calcular RS Ratings en background después de 10 segundos
  setTimeout(() => {
    console.log('[RS] Disparando cálculo de RS Ratings...');
    calculateRSRatingsBackground();
  }, 10000);

  // Iniciar sync de fundamentales del universo en background
  setTimeout(() => {
    console.log('⏰ Disparando sync inicial de fundamentales del universo...');
    queueUniverseFundamentalsSync();
  }, 15000);

  // Recalcular RS Ratings cada 24 horas
  setInterval(() => {
    calculateRSRatingsBackground();
  }, RS_CACHE_DURATION);

  // Refrescar fundamentales diariamente
  setInterval(() => {
    console.log('⏰ Programando refresh diario de fundamentales...');
    queueUniverseFundamentalsSync();
  }, FUNDAMENTALS_SYNC_INTERVAL);
});
