import axios from 'axios';
import fs from 'fs';

console.log('🔍 Analizando TradingView Scanner API...\n');

async function testTradingView() {
  try {
    const url = 'https://scanner.tradingview.com/america/scan';
    
    // Solicitar datos de algunas acciones específicas
    const payload = {
      "symbols": {
        "tickers": ["NASDAQ:AAPL", "NYSE:BABA", "NASDAQ:JOYY", "NYSE:BBVA"],
        "query": { "types": [] }
      },
      "columns": [
        "name", "close", "change", "change_abs", "Recommend.All", "volume", 
        "Value.Traded", "market_cap_basic", "price_earnings_ttm", "earnings_per_share_basic_ttm",
        "number_of_employees", "sector", "description",
        "Perf.W", "Perf.1M", "Perf.3M", "Perf.6M", "Perf.Y", "Perf.YTD",
        "RSI", "RSI[1]", "Stoch.K", "Stoch.D", "MACD.macd", "MACD.signal",
        "ADX", "AO", "Mom", "CCI20",
        "SMA5", "SMA10", "SMA20", "SMA50", "SMA100", "SMA200",
        "EMA5", "EMA10", "EMA20", "EMA50", "EMA100", "EMA200",
        "open", "high", "low", "VWAP",
        "Recommend.Other", "Recommend.MA"
      ]
    };
    
    console.log('📡 Enviando request a TradingView...\n');
    console.log('URL:', url);
    console.log('Símbolos solicitados:', payload.symbols.tickers);
    console.log('Columnas solicitadas:', payload.columns.length, 'campos\n');
    
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 10000
    });
    
    console.log('✅ Respuesta recibida!\n');
    console.log('Total de stocks retornados:', response.data.data.length);
    console.log('='.repeat(80));
    
    // Analizar cada stock
    response.data.data.forEach((stock, index) => {
      const symbol = stock.s.split(':')[1]; // Extraer solo el ticker
      console.log(`\n${index + 1}. ${symbol} (${stock.s})`);
      console.log('-'.repeat(80));
      
      // Mapear datos
      const stockData = {};
      payload.columns.forEach((col, i) => {
        stockData[col] = stock.d[i];
      });
      
      console.log(JSON.stringify(stockData, null, 2));
    });
    
    // Crear ejemplo estructurado
    const example = {
      "FUENTE": "TradingView Scanner API",
      "ENDPOINT": "https://scanner.tradingview.com/america/scan",
      "METODO": "POST",
      "FORMATO_REQUEST": {
        "symbols": {
          "tickers": ["NASDAQ:AAPL", "NYSE:BABA"],
          "query": { "types": [] }
        },
        "columns": ["name", "close", "volume", "RSI", "SMA50", "etc..."]
      },
      "FORMATO_RESPONSE": {
        "totalCount": 4,
        "data": [
          {
            "s": "NASDAQ:AAPL",
            "d": "Array de valores correspondientes a las columnas solicitadas"
          }
        ]
      },
      "EJEMPLO_AAPL": {},
      "CAMPOS_DISPONIBLES": {
        "BASICOS": [
          "name - Nombre completo",
          "close - Precio de cierre/actual",
          "change - Cambio porcentual",
          "change_abs - Cambio absoluto en $",
          "open - Precio de apertura",
          "high - Máximo del día",
          "low - Mínimo del día",
          "volume - Volumen",
          "Value.Traded - Valor negociado",
          "VWAP - Volume Weighted Average Price"
        ],
        "FUNDAMENTALES": [
          "market_cap_basic - Capitalización de mercado",
          "price_earnings_ttm - P/E Ratio (TTM)",
          "earnings_per_share_basic_ttm - EPS (TTM)",
          "number_of_employees - Número de empleados",
          "sector - Sector",
          "description - Descripción de la empresa"
        ],
        "PERFORMANCE": [
          "Perf.W - Performance semanal (%)",
          "Perf.1M - Performance 1 mes (%)",
          "Perf.3M - Performance 3 meses (%)",
          "Perf.6M - Performance 6 meses (%)",
          "Perf.Y - Performance anual (%)",
          "Perf.YTD - Performance año a la fecha (%)"
        ],
        "INDICADORES_TECNICOS": [
          "RSI - Relative Strength Index (14)",
          "RSI14 - RSI de 14 períodos",
          "RSI[1] - RSI del período anterior",
          "Stoch.K - Estocástico K",
          "Stoch.D - Estocástico D",
          "MACD.macd - MACD línea",
          "MACD.signal - MACD señal",
          "ADX - Average Directional Index",
          "AO - Awesome Oscillator",
          "Mom - Momentum",
          "CCI20 - Commodity Channel Index (20)"
        ],
        "MEDIAS_MOVILES_SIMPLES": [
          "SMA5 - Media móvil simple 5 períodos",
          "SMA10 - Media móvil simple 10 períodos",
          "SMA20 - Media móvil simple 20 períodos",
          "SMA50 - Media móvil simple 50 períodos",
          "SMA100 - Media móvil simple 100 períodos",
          "SMA200 - Media móvil simple 200 períodos"
        ],
        "MEDIAS_MOVILES_EXPONENCIALES": [
          "EMA5 - Media móvil exponencial 5 períodos",
          "EMA10 - Media móvil exponencial 10 períodos",
          "EMA20 - Media móvil exponencial 20 períodos",
          "EMA50 - Media móvil exponencial 50 períodos",
          "EMA100 - Media móvil exponencial 100 períodos",
          "EMA200 - Media móvil exponencial 200 períodos"
        ],
        "RECOMENDACIONES": [
          "Recommend.All - Recomendación general (-1 a 1)",
          "Recommend.MA - Recomendación basada en medias móviles",
          "Recommend.Other - Otras recomendaciones"
        ]
      },
      "VENTAJAS": [
        "✅ Totalmente GRATIS, sin API key",
        "✅ Datos en tiempo real",
        "✅ TODOS los indicadores técnicos calculados",
        "✅ Medias móviles (SMA y EMA) ya calculadas",
        "✅ Datos fundamentales (P/E, EPS, market cap)",
        "✅ Performance histórica (1W, 1M, 3M, 6M, 1Y)",
        "✅ Sin rate limiting aparente (al menos 5000 stocks por request)",
        "✅ Muy confiable y rápido"
      ],
      "LIMITACIONES": [
        "⚠️ No incluye ADRs (BABA, JOYY, BBVA no aparecen con búsqueda general)",
        "⚠️ Requiere especificar exchange (NASDAQ:, NYSE:, etc)",
        "⚠️ Máximo ~5000 stocks por request",
        "⚠️ Algunos ADRs necesitan búsqueda específica por símbolo"
      ]
    };
    
    // Agregar datos reales del primer stock (AAPL)
    if (response.data.data.length > 0) {
      const aapl = response.data.data[0];
      const aaplData = {};
      payload.columns.forEach((col, i) => {
        aaplData[col] = aapl.d[i];
      });
      example.EJEMPLO_AAPL = aaplData;
    }
    
    fs.writeFileSync('TRADINGVIEW_EJEMPLO.json', JSON.stringify(example, null, 2));
    console.log('\n\n✅ Documentación guardada en: TRADINGVIEW_EJEMPLO.json');
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN COMPARATIVO');
    console.log('='.repeat(80));
    console.log('\nYAHOO FINANCE vs TRADINGVIEW\n');
    console.log('Yahoo Finance:');
    console.log('  ✅ Gratis, sin API key');
    console.log('  ✅ Incluye TODOS los símbolos (stocks + ADRs)');
    console.log('  ✅ Histórico de 1 año para calcular SMAs');
    console.log('  ❌ Rate limiting agresivo (~2000/hora)');
    console.log('  ❌ No trae indicadores técnicos (hay que calcularlos)');
    console.log('  ❌ No trae EMAs');
    console.log('  ❌ Inestable (errores 401, 429 frecuentes)\n');
    
    console.log('TradingView Scanner:');
    console.log('  ✅ Gratis, sin API key');
    console.log('  ✅ TODOS los indicadores ya calculados (RSI, MACD, etc)');
    console.log('  ✅ SMAs y EMAs ya calculadas (5, 10, 20, 50, 100, 200)');
    console.log('  ✅ Datos fundamentales (P/E, EPS, market cap)');
    console.log('  ✅ Performance histórica (1W, 1M, 3M, 6M, 1Y)');
    console.log('  ✅ Muy confiable y rápido');
    console.log('  ✅ 5000 stocks por request');
    console.log('  ❌ NO incluye ADRs en búsqueda general');
    console.log('  ❌ Necesita conocer el exchange (NASDAQ:, NYSE:)');
    
    console.log('\n💡 RECOMENDACIÓN:');
    console.log('   Usar TradingView como fuente principal (más completa y confiable)');
    console.log('   + Yahoo Finance solo para ADRs que falten');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

await testTradingView();
