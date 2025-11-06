import axios from 'axios';
import fs from 'fs';

/**
 * Script para descargar TODAS las acciones del mercado de EEUU
 * Fuente: FTP oficial de NASDAQ Trader
 * URL: ftp://ftp.nasdaqtrader.com/symboldirectory/nasdaqtraded.txt
 */

async function fetchAllUSStocks() {
  console.log('🔍 Descargando lista completa de acciones de EEUU...\n');
  
  const allStocks = [];
  
  try {
    // Descargar archivo oficial de NASDAQ con TODAS las acciones
    console.log('📊 Descargando desde FTP oficial de NASDAQ...');
    const ftpUrl = 'https://www.nasdaqtrader.com/dynamic/symdir/nasdaqtraded.txt';
    
    const response = await axios.get(ftpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Parsear archivo de texto delimitado por |
    const lines = response.data.split('\n');
    console.log(`📄 Archivo descargado: ${lines.length} líneas`);
    
    // Primera línea es el header
    const headers = lines[0].split('|').map(h => h.trim());
    console.log('📋 Columnas:', headers);
    
    // Procesar cada línea (saltar header y footer)
    for (let i = 1; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split('|').map(v => v.trim());
      
      // Estructura del archivo:
      // 0: Nasdaq Traded
      // 1: Symbol
      // 2: Security Name
      // 3: Listing Exchange
      // 4: Market Category
      // 5: ETF
      // 6: Round Lot Size
      // 7: Test Issue
      // 8: Financial Status
      // 9: CQS Symbol
      // 10: NASDAQ Symbol
      // 11: NextShares
      
      const symbol = values[1];
      const name = values[2];
      const exchange = values[3];
      const isETF = values[5] === 'Y';
      const isTestIssue = values[7] === 'Y';
      
      // Filtrar solo acciones válidas (no test issues, no warrants, etc.)
      if (!symbol || isTestIssue) continue;
      if (symbol.length > 5) continue; // Filtrar símbolos muy largos
      if (symbol.includes('.') || symbol.includes('-') || symbol.includes('^')) continue;
      
      allStocks.push({
        symbol: symbol,
        name: name || symbol,
        exchange: exchange || 'NASDAQ',
        isETF: isETF
      });
    }
    
    console.log(`✅ Total procesado: ${allStocks.length} acciones`)
    
    console.log(`✅ Total procesado: ${allStocks.length} acciones`);
    
    // Remover duplicados
    const uniqueStocks = Array.from(
      new Map(allStocks.map(stock => [stock.symbol, stock])).values()
    );
    
    console.log(`\n✨ Total de acciones únicas: ${uniqueStocks.length}`);
    
    // Separar acciones y ETFs
    const stocks = uniqueStocks.filter(s => !s.isETF);
    const etfs = uniqueStocks.filter(s => s.isETF);
    console.log(`   📊 Acciones: ${stocks.length}`);
    console.log(`   📦 ETFs: ${etfs.length}`);
    
    // Guardar TODO en archivo JSON
    const outputPath = './all-us-stocks.json';
    fs.writeFileSync(outputPath, JSON.stringify(uniqueStocks, null, 2));
    console.log(`\n💾 Lista completa guardada en: ${outputPath}`);
    
    // Guardar solo los símbolos en un archivo separado (más liviano para cargar)
    const symbolsOnly = uniqueStocks.map(s => s.symbol);
    fs.writeFileSync('./all-us-symbols.json', JSON.stringify(symbolsOnly, null, 2));
    console.log(`💾 Solo símbolos guardados en: ./all-us-symbols.json`);
    
    // Estadísticas por exchange
    console.log('\n📈 Estadísticas por Exchange:');
    const byExchange = uniqueStocks.reduce((acc, stock) => {
      acc[stock.exchange] = (acc[stock.exchange] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(byExchange).forEach(([exchange, count]) => {
      console.log(`   ${exchange}: ${count}`);
    });
    
    return uniqueStocks;
    
  } catch (error) {
    console.error('❌ Error descargando acciones:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    throw error;
  }
}

// Ejecutar
fetchAllUSStocks()
  .then(() => {
    console.log('\n✅ ¡Proceso completado exitosamente!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error en el proceso:', error);
    process.exit(1);
  });
