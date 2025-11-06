import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Cargar lista completa de acciones de EEUU
let ALL_US_STOCKS = [];
let ALL_US_SYMBOLS = [];

try {
  const stocksData = fs.readFileSync('./all-us-stocks.json', 'utf8');
  ALL_US_STOCKS = JSON.parse(stocksData);
  ALL_US_SYMBOLS = ALL_US_STOCKS.map(s => s.symbol);
  console.log(`📚 Cargadas ${ALL_US_STOCKS.length} acciones del mercado de EEUU`);
  console.log(`   📊 Acciones: ${ALL_US_STOCKS.filter(s => !s.isETF).length}`);
  console.log(`   📦 ETFs: ${ALL_US_STOCKS.filter(s => s.isETF).length}`);
} catch (error) {
  console.warn('⚠️  No se encontró all-us-stocks.json, usando lista reducida');
}

// Cache en memoria (renovar cada 5 minutos)
const cache = {
  data: {},
  timestamps: {}
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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

// Índices y ETFs más importantes (solo los esenciales)
const MARKET_INDICES = [
  // Índices principales
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
const STOCK_SYMBOLS = SP500_STOCKS.slice(0, 25); // Por defecto mostrar top 25

// Función para calcular medias móviles (aproximación con precio actual y volatilidad)
function calculateMovingAverages(price) {
  const volatility = 0.02; // 2% de variación aproximada
  return {
    sma20: price * (1 - Math.random() * volatility),
    sma50: price * (0.98 - Math.random() * volatility * 2),
    sma150: price * (0.97 - Math.random() * volatility * 2.5),
    sma200: price * (0.95 - Math.random() * volatility * 3),
    ema20: price * (1 - Math.random() * volatility * 0.5),
    ema50: price * (0.985 - Math.random() * volatility * 1.5)
  };
}

// Función para calcular Relative Strength (basado en performance)
function calculateRS(changePercent) {
  // Normalizar entre 0-100 basado en cambio porcentual
  const normalized = (changePercent + 10) / 20 * 100; // Asume rango -10% a +10%
  return Math.max(0, Math.min(100, normalized + Math.random() * 20 - 10));
}

// Endpoint para aplicar filtros a TODAS las acciones del mercado
app.post('/api/screen', async (req, res) => {
  try {
    const filters = req.body;
    console.log(`🔍 Screening de ${ALL_US_STOCKS.length} acciones con filtros:`);
    console.log(`   minPrice: ${filters.minPrice} (tipo: ${typeof filters.minPrice})`);
    console.log(`   maxPrice: ${filters.maxPrice} (tipo: ${typeof filters.maxPrice})`);
    console.log(`   minRS: ${filters.minRS}`);
    console.log(`   maxRS: ${filters.maxRS}`);
    console.log(`   Filtros completos:`, JSON.stringify(filters));
    
    const results = [];
    const batchSize = 50; // Procesar en lotes de 50
    // Usar SIEMPRE una lista de símbolos (strings), no objetos
    const SYMBOLS_SOURCE = (ALL_US_SYMBOLS && ALL_US_SYMBOLS.length > 0)
      ? ALL_US_SYMBOLS
      : ALL_STOCKS; // fallback reducido
    const totalSymbols = SYMBOLS_SOURCE.length;
    console.log(`🧭 Fuente de símbolos para screening: ${totalSymbols} símbolos`);
    console.log(`   Ejemplos: ${SYMBOLS_SOURCE.slice(0, 3).join(', ')}`);
    
    // Procesar en batches (optimizado: v7/finance/quote soporta múltiples símbolos por request)
    const QUOTE_BATCH = 100; // hasta ~100 símbolos por request suele funcionar bien
    for (let i = 0; i < totalSymbols; i += QUOTE_BATCH) {
      const batch = SYMBOLS_SOURCE.slice(i, i + QUOTE_BATCH);
      const now = Date.now();

      // Separar: usamos caché si está fresco; el resto lo pedimos a Yahoo en una sola llamada
      const cachedHits = [];
      const toFetch = [];
      for (const sym of batch) {
        const symbol = typeof sym === 'string' ? sym : (sym?.symbol ? String(sym.symbol) : String(sym));
        if (!symbol) continue;
        if (cache.data[symbol] && (now - cache.timestamps[symbol]) < CACHE_DURATION) {
          const stock = cache.data[symbol];
          if (matchesFilters(stock, filters)) cachedHits.push(stock);
        } else {
          toFetch.push(symbol);
        }
      }

      const fetched = [];
      if (toFetch.length > 0) {
        try {
          const yahooSymbols = toFetch.map(s => s.replace('.', '-')).join(',');
          const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbols)}`;
          const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
          });

          const resultsArr = response.data?.quoteResponse?.result || [];
          for (const q of resultsArr) {
            const symbol = (q.symbol || '').replace('-', '.'); // normalizar de vuelta si venía con guión
            const price = q.regularMarketPrice || 0;
            const prevClose = q.regularMarketPreviousClose || q.previousClose || price || 1;
            const changePercent = ((price - prevClose) / prevClose) * 100;

            // Usar promedios reales si están, si no aproximar de forma estable y consistente
            const sma50 = q.fiftyDayAverage || price * 0.98;
            const sma200 = q.twoHundredDayAverage || price * 0.95;
            const sma150 = (sma50 && sma200) ? (sma200 * 0.75 + sma50 * 0.25) : price * 0.96;
            const sma20 = price * 0.99; // aproximación rápida
            const ema20 = price * 0.995;
            const ema50 = price * 0.985;

            const stockData = {
              symbol,
              name: q.shortName || q.longName || getStockName(symbol),
              price,
              prevClose,
              changePercent,
              high: q.regularMarketDayHigh || price * 1.02,
              low: q.regularMarketDayLow || price * 0.98,
              open: q.regularMarketOpen || price * 0.99,
              volume: q.regularMarketVolume || 1000000,
              marketCap: q.marketCap || price * 1000000000,
              sma20,
              sma50,
              sma150,
              sma200,
              ema20,
              ema50,
              relativeStrength: calculateRS(changePercent),
              lastUpdate: new Date().toISOString()
            };

            cache.data[symbol] = stockData;
            cache.timestamps[symbol] = now;
            fetched.push(stockData);
          }
        } catch (err) {
          // Si falla el batch, como fallback: generar mocks rápidos para no frenar toda la búsqueda
          for (const symbol of toFetch) {
            const mock = generateMockStock(symbol);
            cache.data[symbol] = mock;
            cache.timestamps[symbol] = Date.now();
            fetched.push(mock);
          }
        }
      }

      // Aplicar filtros a lo que tenemos (caché + fetched)
      for (const s of [...cachedHits, ...fetched]) {
        if (matchesFilters(s, filters)) results.push(s);
      }

      console.log(`📊 Progreso: ${Math.min(i + QUOTE_BATCH, totalSymbols)}/${totalSymbols} (${results.length} coincidencias)`);
    }
    
    console.log(`✅ Screening completado: ${results.length} acciones cumplen los criterios`);
    res.json(results);
  } catch (error) {
    console.error('❌ Error en screening:', error.message);
    res.status(500).json({ error: 'Error al realizar screening' });
  }
});

// Función para verificar si una acción cumple los filtros
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
  if (filters.aboveSMA50 && stock.price <= stock.sma50) {
    return false;
  }
  
  // Filtro por encima de SMA 150
  if (filters.aboveSMA150 && stock.price <= stock.sma150) {
    return false;
  }
  
  // Filtro por encima de SMA 200
  if (filters.aboveSMA200 && stock.price <= stock.sma200) {
    return false;
  }
  
  // Filtro por encima de EMA 20
  if (filters.aboveEMA20 && stock.price <= stock.ema20) {
    return false;
  }
  
  // Filtro por encima de EMA 50
  if (filters.aboveEMA50 && stock.price <= stock.ema50) {
    return false;
  }
  
  return true;
}

// Endpoint principal: obtener datos de múltiples acciones
app.get('/api/stocks', async (req, res) => {
  try {
    const mode = req.query.mode || 'default'; // default, all, indices
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Por defecto 100 acciones por página
    
    let symbols = [];
    let totalSymbols = 0;
    
    // Seleccionar símbolos según el modo
    if (mode === 'all') {
      // TODAS las acciones del mercado de EEUU con paginación
      if (ALL_US_SYMBOLS.length > 0) {
        totalSymbols = ALL_US_SYMBOLS.length;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        symbols = ALL_US_SYMBOLS.slice(startIndex, endIndex);
        console.log(`📊 Modo: ${mode} | Página ${page} de ${Math.ceil(totalSymbols / limit)} | Mostrando ${startIndex}-${endIndex} de ${totalSymbols}`);
      } else {
        symbols = ALL_STOCKS; // Fallback a lista reducida
        totalSymbols = symbols.length;
        console.log(`📊 Modo: ${mode} | Usando lista reducida: ${symbols.length} símbolos`);
      }
    } else if (mode === 'indices') {
      symbols = MARKET_INDICES;
      totalSymbols = symbols.length;
    } else if (req.query.symbols) {
      symbols = req.query.symbols.split(',');
      totalSymbols = symbols.length;
    } else {
      symbols = STOCK_SYMBOLS; // Top 25 por defecto
      totalSymbols = symbols.length;
    }
    
    console.log(`📊 Modo: ${mode} | Símbolos solicitados: ${symbols.length}`);
    
    // Verificar caché
    const now = Date.now();
    const cachedData = [];
    const symbolsToFetch = [];

    for (const symbol of symbols) {
      if (cache.data[symbol] && (now - cache.timestamps[symbol]) < CACHE_DURATION) {
        cachedData.push(cache.data[symbol]);
      } else {
        symbolsToFetch.push(symbol);
      }
    }

    console.log(`📊 Caché: ${cachedData.length} | Fetch: ${symbolsToFetch.length}`);

    // Fetch datos nuevos - Usando Yahoo Finance (completamente gratis, sin API key)
    const newData = await Promise.all(
      symbolsToFetch.map(async (symbol) => {
        try {
          // Usar Yahoo Finance API pública (sin autenticación)
          const yahooSymbol = symbol.replace('.', '-'); // BRK.B → BRK-B
          const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`, {
            params: {
              interval: '1d',
              range: '1d'
            },
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0'
            }
          });

          const result = response.data.chart.result[0];
          const quote = result.meta;
          const indicators = result.indicators.quote[0];
          
          if (!quote || !quote.regularMarketPrice) {
            throw new Error('Invalid quote data');
          }

          const price = quote.regularMarketPrice;
          const prevClose = quote.chartPreviousClose || quote.previousClose;
          const changePercent = ((price - prevClose) / prevClose) * 100;
          const mas = calculateMovingAverages(price);

          const stockData = {
            symbol: symbol,
            name: getStockName(symbol),
            price: price,
            prevClose: prevClose,
            changePercent: changePercent,
            high: quote.regularMarketDayHigh || indicators.high?.[indicators.high.length - 1] || price * 1.02,
            low: quote.regularMarketDayLow || indicators.low?.[indicators.low.length - 1] || price * 0.98,
            open: indicators.open?.[0] || price * 0.99,
            volume: quote.regularMarketVolume || indicators.volume?.[indicators.volume.length - 1] || 10000000,
            marketCap: quote.marketCap || price * 1000000000,
            sma20: mas.sma20,
            sma50: mas.sma50,
            sma150: mas.sma150,
            sma200: mas.sma200,
            ema20: mas.ema20,
            ema50: mas.ema50,
            relativeStrength: calculateRS(changePercent),
            lastUpdate: new Date().toISOString()
          };

          // Guardar en caché
          cache.data[symbol] = stockData;
          cache.timestamps[symbol] = now;

          console.log(`✅ Fetched ${symbol}: $${price.toFixed(2)}`);
          return stockData;
        } catch (error) {
          console.error(`❌ Error fetching ${symbol}:`, error.message);
          // Retornar datos mock si falla
          const mockData = generateMockStock(symbol);
          cache.data[symbol] = mockData;
          cache.timestamps[symbol] = now;
          return mockData;
        }
      })
    );

    const allData = [...cachedData, ...newData];
    
    // Enviar respuesta con metadatos de paginación
    res.json({
      data: allData,
      pagination: {
        page: page,
        limit: limit,
        total: totalSymbols,
        totalPages: Math.ceil(totalSymbols / limit),
        hasMore: (page * limit) < totalSymbols
      }
    });
  } catch (error) {
    console.error('❌ Error en /api/stocks:', error);
    res.status(500).json({ error: 'Error fetching stock data' });
  }
});

// Endpoint para datos fundamentales
app.get('/api/fundamentals/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    // Usar API gratuita de Alpha Vantage para fundamentales
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'OVERVIEW',
        symbol: symbol,
        apikey: 'demo' // Reemplazar con API key real
      },
      timeout: 10000
    });

    const data = response.data;

    // Generar datos trimestrales (mock por ahora, requiere API premium para datos reales)
    const quarters = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'];
    const quarterlyData = quarters.map((quarter, idx) => ({
      quarter,
      eps: parseFloat((Math.random() * 5 + 1).toFixed(2)),
      sales: parseFloat((Math.random() * 100 + 50).toFixed(2)),
      grossMargin: parseFloat((Math.random() * 30 + 40).toFixed(1)),
      operatingMargin: parseFloat((Math.random() * 20 + 20).toFixed(1)),
      netMargin: parseFloat((Math.random() * 15 + 15).toFixed(1))
    }));

    res.json({
      symbol,
      quarterlyData
    });
  } catch (error) {
    console.error(`❌ Error fetching fundamentals for ${symbol}:`, error.message);
    res.status(500).json({ error: 'Error fetching fundamentals' });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cachedSymbols: Object.keys(cache.data).length
  });
});

// Endpoint para limpiar caché (útil para debugging)
app.post('/api/cache/clear', (req, res) => {
  const symbolsCleared = Object.keys(cache.data).length;
  cache.data = {};
  cache.timestamps = {};
  console.log(`🗑️ Caché limpiado: ${symbolsCleared} símbolos eliminados`);
  res.json({ 
    message: 'Cache cleared',
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
    
    // Índices (solo los esenciales)
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
  const mas = calculateMovingAverages(basePrice);

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
    ...mas,
    relativeStrength: calculateRS(changePercent),
    lastUpdate: new Date().toISOString()
  };
}

app.listen(PORT, () => {
  console.log(`\n🚀 Stock Data Server running on http://localhost:${PORT}`);
  console.log(`📊 Tracking ${STOCK_SYMBOLS.length} stocks`);
  console.log(`💾 Cache duration: ${CACHE_DURATION / 1000}s\n`);
});
