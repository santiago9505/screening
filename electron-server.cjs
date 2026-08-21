// Servidor Express simplificado para Electron
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

function createServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Logging
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
  
  // API: Get stocks data
  app.get('/api/stocks', async (req, res) => {
    try {
      const mode = req.query.mode || 'default';
      const stocksPath = path.join(__dirname, 'all-us-stocks.json');
      
      if (!fs.existsSync(stocksPath)) {
        console.log('Archivo de stocks no encontrado, devolviendo datos de ejemplo');
        return res.json({
          data: [],
          total: 0,
          mode: mode
        });
      }
      
      const stocksData = JSON.parse(fs.readFileSync(stocksPath, 'utf8'));
      
      let stocks = [];
      if (mode === 'all') {
        stocks = stocksData;
      } else if (mode === 'indices') {
        stocks = stocksData.filter(s => s.symbol.startsWith('^'));
      } else {
        // Top 25 por defecto
        stocks = stocksData.slice(0, 25);
      }
      
      res.json({
        data: stocks,
        total: stocksData.length,
        mode: mode
      });
    } catch (error) {
      console.error('Error loading stocks:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // API: Screen stocks with filters
  app.post('/api/screen', async (req, res) => {
    try {
      const filters = req.body;
      const stocksPath = path.join(__dirname, 'all-us-stocks.json');
      
      if (!fs.existsSync(stocksPath)) {
        return res.json([]);
      }
      
      let stocks = JSON.parse(fs.readFileSync(stocksPath, 'utf8'));
      
      // Aplicar filtros básicos
      if (filters.priceMin) stocks = stocks.filter(s => s.price >= filters.priceMin);
      if (filters.priceMax) stocks = stocks.filter(s => s.price <= filters.priceMax);
      if (filters.volumeMin) stocks = stocks.filter(s => s.volume >= filters.volumeMin);
      if (filters.marketCapMin) stocks = stocks.filter(s => s.marketCap >= filters.marketCapMin);
      if (filters.aboveSMA20) stocks = stocks.filter(s => s.price > s.sma20);
      if (filters.aboveSMA50) stocks = stocks.filter(s => s.price > s.sma50);
      if (filters.aboveSMA200) stocks = stocks.filter(s => s.price > s.sma200);
      if (filters.rsMin) stocks = stocks.filter(s => s.relativeStrength >= filters.rsMin);
      
      res.json(stocks);
    } catch (error) {
      console.error('Error screening stocks:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // API: Clear cache (placeholder)
  app.post('/api/cache/clear', (req, res) => {
    console.log('Cache clear requested');
    res.json({ success: true });
  });
  
  // Servir archivos estáticos del frontend
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  
  // Todas las rutas no-API devuelven el index.html (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  
  return app;
}

module.exports = { createServer };
