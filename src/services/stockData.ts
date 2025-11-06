import axios from 'axios';
import { Stock, QuarterlyData, StockFundamentals } from '../types';

// Finnhub API - Gratuita con 60 llamadas/minuto
// Regístrate en: https://finnhub.io/
const FINNHUB_API_KEY = 'd46cpjpr01qgc9es7ac0d46cpjpr01qgc9es7acg'; // API key configurada
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Alpha Vantage API - Alternativa gratuita
const ALPHA_VANTAGE_API_KEY = 'demo'; // Reemplazar con tu API key
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Cache para evitar llamadas repetidas
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos (aumentado de 5)

// Lista de símbolos populares para el screener (reducida para evitar rate limits)
export const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META',
  'V', 'JPM', 'WMT', 'MA', 'HD', 'NFLX',
  'ADBE', 'CRM', 'CSCO', 'NKE', 'INTC', 'AMD',
  'ORCL', 'COST', 'MCD', 'UNH'
];

class StockDataService {
  private async getCachedData(key: string, fetchFn: () => Promise<any>) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    
    const data = await fetchFn();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  async getQuote(symbol: string): Promise<any> {
    try {
      const cacheKey = `quote_${symbol}`;
      return await this.getCachedData(cacheKey, async () => {
        const response = await axios.get(`${FINNHUB_BASE_URL}/quote`, {
          params: { symbol, token: FINNHUB_API_KEY }
        });
        return response.data;
      });
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(`Rate limit alcanzado para ${symbol}, usando datos en caché si existen`);
      } else {
        console.error(`Error fetching quote for ${symbol}:`, error);
      }
      return null;
    }
  }

  async getCompanyProfile(symbol: string): Promise<any> {
    try {
      const cacheKey = `profile_${symbol}`;
      return await this.getCachedData(cacheKey, async () => {
        const response = await axios.get(`${FINNHUB_BASE_URL}/stock/profile2`, {
          params: { symbol, token: FINNHUB_API_KEY }
        });
        return response.data;
      });
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(`Rate limit alcanzado para ${symbol}`);
      } else {
        console.error(`Error fetching profile for ${symbol}:`, error);
      }
      return null;
    }
  }

  async getHistoricalData(symbol: string, days: number = 365): Promise<number[]> {
    try {
      const cacheKey = `historical_${symbol}_${days}`;
      return await this.getCachedData(cacheKey, async () => {
        const to = Math.floor(Date.now() / 1000);
        const from = to - (days * 24 * 60 * 60);
        
        const response = await axios.get(`${FINNHUB_BASE_URL}/stock/candle`, {
          params: {
            symbol,
            resolution: 'D',
            from,
            to,
            token: FINNHUB_API_KEY
          }
        });
        
        return response.data.c || [];
      });
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(`Rate limit alcanzado para datos históricos de ${symbol}`);
      } else {
        console.error(`Error fetching historical data for ${symbol}:`, error);
      }
      return [];
    }
  }

  calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  calculateRelativeStrength(stockPrices: number[], spyPrices: number[]): number {
    if (stockPrices.length < 2 || spyPrices.length < 2) return 0;
    
    const stockReturn = ((stockPrices[stockPrices.length - 1] - stockPrices[0]) / stockPrices[0]) * 100;
    const spyReturn = ((spyPrices[spyPrices.length - 1] - spyPrices[0]) / spyPrices[0]) * 100;
    
    // RS Rating estilo MarketSmith (0-100)
    const relativePerformance = stockReturn - spyReturn;
    return Math.max(0, Math.min(100, 50 + relativePerformance));
  }

  async getStockData(symbol: string, spyPrices: number[]): Promise<Stock | null> {
    try {
      const [quote, profile, historicalPrices] = await Promise.all([
        this.getQuote(symbol),
        this.getCompanyProfile(symbol),
        this.getHistoricalData(symbol, 365)
      ]);

      if (!quote || !quote.c || !profile) return null;

      const sma20 = this.calculateSMA(historicalPrices, 20);
      const sma50 = this.calculateSMA(historicalPrices, 50);
      const sma200 = this.calculateSMA(historicalPrices, 200);
      const ema20 = this.calculateEMA(historicalPrices, 20);
      const ema50 = this.calculateEMA(historicalPrices, 50);
      const relativeStrength = this.calculateRelativeStrength(historicalPrices, spyPrices);

      return {
        symbol,
        name: profile.name || symbol,
        price: quote.c,
        change: quote.d || 0,
        changePercent: quote.dp || 0,
        volume: profile.shareOutstanding || 0,
        marketCap: profile.marketCapitalization || 0,
        sma20,
        sma50,
        sma200,
        ema20,
        ema50,
        relativeStrength,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error(`Error getting stock data for ${symbol}:`, error);
      return null;
    }
  }

  async getFundamentals(symbol: string): Promise<StockFundamentals | null> {
    try {
      // Usando Alpha Vantage para datos fundamentales (más completo gratis)
      const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'EARNINGS',
          symbol,
          apikey: ALPHA_VANTAGE_API_KEY
        }
      });

      const quarterlyEarnings = response.data.quarterlyEarnings || [];
      
      const quarterlyData: QuarterlyData[] = quarterlyEarnings.slice(0, 8).map((q: any, index: number) => {
        const prevEPS = quarterlyEarnings[index + 1]?.reportedEPS || q.reportedEPS;
        const epsGrowth = prevEPS ? ((q.reportedEPS - prevEPS) / prevEPS) * 100 : 0;

        return {
          quarter: q.fiscalDateEnding.substring(5, 7),
          year: parseInt(q.fiscalDateEnding.substring(0, 4)),
          eps: parseFloat(q.reportedEPS) || 0,
          epsGrowth,
          revenue: parseFloat(q.estimatedEPS) * 1000000 || 0, // Estimado
          revenueGrowth: epsGrowth, // Simplificado
          netMargin: 15, // Placeholder
          operatingMargin: 20, // Placeholder
          grossMargin: 40 // Placeholder
        };
      });

      return {
        symbol,
        quarterlyData,
        peRatio: 0, // Placeholder
        forwardPE: 0, // Placeholder
        pegRatio: 0 // Placeholder
      };
    } catch (error) {
      console.error(`Error fetching fundamentals for ${symbol}:`, error);
      return null;
    }
  }

  async getScreenerData(): Promise<Stock[]> {
    try {
      // Primero obtenemos los precios de SPY para calcular RS
      const spyPrices = await this.getHistoricalData('SPY', 365);
      
      // Reducimos llamadas simultáneas y aumentamos pausa para evitar rate limit
      const batchSize = 5; // Reducido de 10 a 5
      const stocks: Stock[] = [];
      
      console.log(`Cargando ${POPULAR_STOCKS.length} acciones en batches de ${batchSize}...`);
      
      for (let i = 0; i < POPULAR_STOCKS.length; i += batchSize) {
        const batch = POPULAR_STOCKS.slice(i, i + batchSize);
        console.log(`Procesando batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(POPULAR_STOCKS.length/batchSize)}: ${batch.join(', ')}`);
        
        const batchResults = await Promise.all(
          batch.map(symbol => this.getStockData(symbol, spyPrices))
        );
        
        const validStocks = batchResults.filter(s => s !== null) as Stock[];
        stocks.push(...validStocks);
        
        console.log(`✓ ${validStocks.length} acciones cargadas exitosamente`);
        
        // Pausa de 2 segundos entre batches para respetar rate limit
        if (i + batchSize < POPULAR_STOCKS.length) {
          console.log('Esperando 2 segundos antes del siguiente batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`✅ Total: ${stocks.length} acciones cargadas`);
      return stocks;
    } catch (error) {
      console.error('Error fetching screener data:', error);
      return [];
    }
  }
}

export const stockDataService = new StockDataService();
