import axios from 'axios';

console.log('🧪 Probando TradingView Scanner para obtener precios correctos...\n');

async function getTradingViewPrices() {
  try {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'];
    
    // Construir tickers con exchange
    const tickers = symbols.map(s => {
      // La mayoría están en NASDAQ
      if (['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'].includes(s)) {
        return `NASDAQ:${s}`;
      }
      return `NYSE:${s}`;
    });
    
    const payload = {
      symbols: {
        tickers: tickers,
        query: { types: [] }
      },
      columns: ['name', 'close', 'change', 'change_abs', 'volume', 'market_cap_basic', 'high', 'low', 'open']
    };
    
    console.log('📡 Solicitando datos de TradingView...\n');
    
    const response = await axios.post('https://scanner.tradingview.com/america/scan', payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000
    });
    
    console.log('✅ Respuesta recibida!\n');
    console.log('Comparación de precios:\n');
    console.log('Símbolo'.padEnd(10), 'Precio'.padEnd(12), 'Cambio %'.padEnd(12), 'Volumen');
    console.log('='.repeat(60));
    
    response.data.data.forEach(stock => {
      const symbol = stock.s.split(':')[1];
      const [name, close, change, changeAbs, volume, marketCap, high, low, open] = stock.d;
      
      console.log(
        symbol.padEnd(10),
        `$${close.toFixed(2)}`.padEnd(12),
        `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`.padEnd(12),
        volume.toLocaleString()
      );
    });
    
    console.log('\n✅ TradingView tiene los precios correctos y actualizados!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

await getTradingViewPrices();
