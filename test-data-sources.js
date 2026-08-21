import axios from 'axios';

console.log('🔍 Analizando fuentes de datos del screener...\n');

// Test 1: Ver qué devuelve el servidor local
async function testLocalServer() {
  console.log('1️⃣ SERVIDOR LOCAL (http://localhost:3002)');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.post('http://localhost:3002/api/screen', {
      minPrice: 50,
      maxPrice: 300
    }, { timeout: 30000 });
    
    const stock = response.data.stocks[0];
    console.log('\n📊 Ejemplo de acción devuelta:\n');
    console.log(JSON.stringify(stock, null, 2));
    
    console.log('\n📋 Campos disponibles:');
    Object.keys(stock).forEach(key => {
      console.log(`   - ${key}: ${typeof stock[key]}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test 2: Ver qué devuelve Yahoo Finance directamente
async function testYahooFinance() {
  console.log('\n\n2️⃣ YAHOO FINANCE API (query1.finance.yahoo.com)');
  console.log('='.repeat(60));
  
  try {
    const symbol = 'AAPL';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const response = await axios.get(url, {
      params: { interval: '1d', range: '1y' },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    
    const result = response.data?.chart?.result?.[0];
    const quote = result.meta;
    const indicators = result.indicators?.quote?.[0];
    
    console.log('\n📊 Ejemplo Yahoo Finance (AAPL):\n');
    console.log('META (información básica):');
    console.log(JSON.stringify({
      regularMarketPrice: quote.regularMarketPrice,
      chartPreviousClose: quote.chartPreviousClose,
      regularMarketDayHigh: quote.regularMarketDayHigh,
      regularMarketDayLow: quote.regularMarketDayLow,
      regularMarketOpen: quote.regularMarketOpen,
      regularMarketVolume: quote.regularMarketVolume,
      marketCap: quote.marketCap,
      currency: quote.currency,
      symbol: quote.symbol
    }, null, 2));
    
    console.log('\n\nINDICATORS (datos históricos):');
    console.log(`   - close: Array de ${indicators.close.length} precios de cierre`);
    console.log(`   - high: Array de ${indicators.high.length} máximos`);
    console.log(`   - low: Array de ${indicators.low.length} mínimos`);
    console.log(`   - open: Array de ${indicators.open.length} aperturas`);
    console.log(`   - volume: Array de ${indicators.volume.length} volúmenes`);
    console.log(`   - Últimos 5 cierres: [${indicators.close.slice(-5).map(p => p?.toFixed(2)).join(', ')}]`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

await testLocalServer();
await testYahooFinance();

console.log('\n\n' + '='.repeat(60));
console.log('📝 RESUMEN DE FUENTES DE DATOS');
console.log('='.repeat(60));
console.log(`
FUENTE ACTUAL: Yahoo Finance (query1.finance.yahoo.com)
ENDPOINT: /v8/finance/chart/{symbol}
RANGO: 1 año de datos históricos

DATOS DISPONIBLES:
  ✅ Precio actual (regularMarketPrice)
  ✅ Precio anterior (chartPreviousClose)
  ✅ Alto/Bajo del día (regularMarketDayHigh/Low)
  ✅ Apertura (regularMarketOpen)
  ✅ Volumen (regularMarketVolume)
  ✅ Capitalización de mercado (marketCap)
  ✅ Histórico de ~252 días (para calcular SMAs)
  
DATOS CALCULADOS EN EL SERVIDOR:
  📊 SMA 50, 150, 200 (desde histórico)
  📊 Relative Strength (desde changePercent)
  📊 Change Percent (precio actual vs anterior)

LIMITACIONES:
  ⚠️  Yahoo Finance gratuito, sin garantía de SLA
  ⚠️  Rate limiting (429 Too Many Requests)
  ⚠️  No incluye todos los indicadores técnicos
  ⚠️  EMA 20/50 no se calculan (requiere más procesamiento)
`);
