import axios from 'axios';
import fs from 'fs';

console.log('🔍 Obteniendo ejemplo completo de datos...\n');

async function getCompleteExample() {
  try {
    // Esperar un momento para que el servidor esté listo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📡 Solicitando datos al servidor...\n');
    
    const response = await axios.post('http://localhost:3002/api/screen', {
      minPrice: 200,
      maxPrice: 300
    }, { timeout: 60000 });
    
    const stock = response.data.stocks[0];
    
    const example = {
      "FUENTE_DE_DATOS": "Yahoo Finance API (query1.finance.yahoo.com/v8/finance/chart)",
      "EJEMPLO_ACCION": stock,
      "DESCRIPCION_CAMPOS": {
        "symbol": "Símbolo de la acción (ej: AAPL, MSFT)",
        "name": "Nombre completo de la empresa",
        "price": "Precio actual de mercado (USD)",
        "prevClose": "Precio de cierre anterior",
        "changePercent": "Cambio porcentual vs cierre anterior (%)",
        "high": "Máximo del día",
        "low": "Mínimo del día",
        "open": "Precio de apertura del día",
        "volume": "Volumen de transacciones",
        "marketCap": "Capitalización de mercado (USD)",
        "sma50": "Media móvil simple de 50 días (calculada desde histórico)",
        "sma150": "Media móvil simple de 150 días (calculada desde histórico)",
        "sma200": "Media móvil simple de 200 días (calculada desde histórico)",
        "sma20": "Media móvil simple de 20 días (no calculada actualmente)",
        "ema20": "Media móvil exponencial de 20 días (no calculada actualmente)",
        "ema50": "Media móvil exponencial de 50 días (no calculada actualmente)",
        "relativeStrength": "Fuerza relativa 0-100 (calculada desde changePercent)",
        "lastUpdate": "Timestamp de última actualización"
      },
      "DATOS_RAW_YAHOO_FINANCE": {
        "endpoint": "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1y",
        "response_structure": {
          "meta": {
            "regularMarketPrice": "Precio actual",
            "chartPreviousClose": "Cierre anterior",
            "regularMarketDayHigh": "Máximo del día",
            "regularMarketDayLow": "Mínimo del día",
            "regularMarketOpen": "Apertura",
            "regularMarketVolume": "Volumen",
            "marketCap": "Capitalización (si disponible)",
            "currency": "Moneda (USD)",
            "symbol": "Símbolo"
          },
          "indicators": {
            "quote": [{
              "close": "Array de ~250 precios de cierre (1 año)",
              "high": "Array de ~250 máximos",
              "low": "Array de ~250 mínimos",
              "open": "Array de ~250 aperturas",
              "volume": "Array de ~250 volúmenes"
            }]
          }
        }
      },
      "CALCULOS_REALIZADOS": {
        "SMA50": "Promedio de últimos 50 cierres del histórico",
        "SMA150": "Promedio de últimos 150 cierres (o promedio SMA50+SMA200 si no hay suficiente data)",
        "SMA200": "Promedio de últimos 200 cierres del histórico",
        "changePercent": "(price - prevClose) / prevClose * 100",
        "relativeStrength": "Normalizado de changePercent entre 0-100"
      },
      "LIMITACIONES": [
        "Yahoo Finance es gratis pero sin SLA garantizado",
        "Rate limiting: ~2000 requests/hora aprox (puede variar)",
        "Error 429 Too Many Requests cuando se excede límite",
        "Algunos símbolos pueden no tener marketCap disponible",
        "EMA 20/50 no se calculan (requiere más procesamiento)",
        "SMA 20 no se calcula actualmente (puede agregarse)"
      ]
    };
    
    // Guardar en archivo JSON
    fs.writeFileSync('DATA_SOURCES_EJEMPLO.json', JSON.stringify(example, null, 2));
    
    console.log('✅ Ejemplo guardado en: DATA_SOURCES_EJEMPLO.json\n');
    console.log(JSON.stringify(example, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

await getCompleteExample();
