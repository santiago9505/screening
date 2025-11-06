import axios from 'axios';
import { Stock, StockFundamentals } from '../types';

const API_URL = 'http://localhost:3002/api';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface StockDataResponse {
  data: Stock[];
  pagination?: PaginationInfo;
}

class StockDataService {
  async getScreenerData(mode: 'default' | 'all' | 'indices' = 'default', page: number = 1, limit: number = 100): Promise<StockDataResponse> {
    try {
      console.log(`📡 Fetching data from backend (mode: ${mode}, page: ${page})...`);
      const response = await axios.get(`${API_URL}/stocks`, {
        params: { mode, page, limit },
        timeout: 60000 // 60 segundos para todas las acciones
      });
      
      // Si la respuesta es un array simple (retrocompatibilidad), convertir al nuevo formato
      if (Array.isArray(response.data)) {
        console.log(`✅ Received ${response.data.length} stocks (legacy format)`);
        return {
          data: response.data,
          pagination: undefined
        };
      }
      
      console.log(`✅ Received ${response.data.data.length} stocks (page ${response.data.pagination?.page}/${response.data.pagination?.totalPages})`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching from backend:', error);
      console.log('⚠️ Falling back to mock data...');
      return {
        data: this.generateMockData(),
        pagination: undefined
      };
    }
  }

  async getStockFundamentals(symbol: string): Promise<StockFundamentals | null> {
    try {
      const response = await axios.get(`${API_URL}/fundamentals/${symbol}`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching fundamentals for ${symbol}:`, error);
      // Fallback a datos mock
      return this.generateMockFundamentals(symbol);
    }
  }

  // Mock data como fallback si el servidor no está disponible
  private generateMockData(): Stock[] {
    const symbols = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B',
      'JPM', 'V', 'JNJ', 'WMT', 'PG', 'MA', 'HD', 'DIS',
      'BAC', 'XOM', 'CVX', 'PFE', 'KO', 'PEP', 'CSCO', 'NFLX', 'INTC'
    ];

    const stockNames: Record<string, string> = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc.',
      'AMZN': 'Amazon.com Inc.',
      'NVDA': 'NVIDIA Corporation',
      'META': 'Meta Platforms Inc.',
      'TSLA': 'Tesla Inc.',
      'BRK.B': 'Berkshire Hathaway',
      'JPM': 'JPMorgan Chase',
      'V': 'Visa Inc.',
      'JNJ': 'Johnson & Johnson',
      'WMT': 'Walmart Inc.',
      'PG': 'Procter & Gamble',
      'MA': 'Mastercard Inc.',
      'HD': 'Home Depot',
      'DIS': 'Walt Disney',
      'BAC': 'Bank of America',
      'XOM': 'Exxon Mobil',
      'CVX': 'Chevron Corporation',
      'PFE': 'Pfizer Inc.',
      'KO': 'Coca-Cola Company',
      'PEP': 'PepsiCo Inc.',
      'CSCO': 'Cisco Systems',
      'NFLX': 'Netflix Inc.',
      'INTC': 'Intel Corporation'
    };

    return symbols.map(symbol => {
      const basePrice = Math.random() * 500 + 50;
      const prevClose = basePrice * (0.98 + Math.random() * 0.04);
      const changePercent = ((basePrice - prevClose) / prevClose) * 100;

      const sma20 = basePrice * (0.97 + Math.random() * 0.06);
      const sma50 = basePrice * (0.95 + Math.random() * 0.08);
      const sma200 = basePrice * (0.90 + Math.random() * 0.12);

      return {
        symbol,
        name: stockNames[symbol] || symbol,
        price: parseFloat(basePrice.toFixed(2)),
        prevClose: parseFloat(prevClose.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        high: parseFloat((basePrice * 1.02).toFixed(2)),
        low: parseFloat((basePrice * 0.98).toFixed(2)),
        open: parseFloat((basePrice * 0.99).toFixed(2)),
        volume: Math.floor(Math.random() * 50000000) + 5000000,
        marketCap: Math.floor(Math.random() * 2000000000000) + 100000000000,
        sma20: parseFloat(sma20.toFixed(2)),
        sma50: parseFloat(sma50.toFixed(2)),
        sma200: parseFloat(sma200.toFixed(2)),
        ema20: parseFloat((basePrice * (0.98 + Math.random() * 0.04)).toFixed(2)),
        ema50: parseFloat((basePrice * (0.96 + Math.random() * 0.06)).toFixed(2)),
        relativeStrength: Math.floor(Math.random() * 100),
        lastUpdate: new Date().toISOString()
      };
    });
  }

  private generateMockFundamentals(symbol: string): StockFundamentals {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const years = [2023, 2023, 2024, 2024];
    
    return {
      symbol,
      quarterlyData: quarters.map((quarter, idx) => ({
        quarter,
        year: years[idx],
        eps: parseFloat((Math.random() * 5 + 1).toFixed(2)),
        epsGrowth: parseFloat((Math.random() * 40 - 10).toFixed(1)),
        revenue: parseFloat((Math.random() * 100 + 50).toFixed(2)),
        revenueGrowth: parseFloat((Math.random() * 30 - 5).toFixed(1)),
        grossMargin: parseFloat((Math.random() * 30 + 40).toFixed(1)),
        operatingMargin: parseFloat((Math.random() * 20 + 20).toFixed(1)),
        netMargin: parseFloat((Math.random() * 15 + 15).toFixed(1)),
      }))
    };
  }
}

export const stockDataService = new StockDataService();
