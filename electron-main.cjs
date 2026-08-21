const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

let mainWindow;
let server;

const PORT = 3002;

function createServer() {
  const appServer = express();
  appServer.use(cors());
  appServer.use(express.json());
  
  // API Endpoints
  appServer.get('/api/stocks', (req, res) => {
    try {
      const mode = req.query.mode || 'default';
      const stocksFile = path.join(__dirname, 'all-us-stocks.json');
      
      if (!fs.existsSync(stocksFile)) {
        return res.json({ data: [], total: 0, mode });
      }
      
      const allStocks = JSON.parse(fs.readFileSync(stocksFile, 'utf8'));
      let stocks = [];
      
      if (mode === 'all') {
        stocks = allStocks;
      } else if (mode === 'indices') {
        stocks = allStocks.filter(s => s.symbol.startsWith('^'));
      } else {
        stocks = allStocks.slice(0, 25);
      }
      
      res.json({ data: stocks, total: allStocks.length, mode });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  appServer.post('/api/screen', (req, res) => {
    try {
      const filters = req.body;
      const stocksFile = path.join(__dirname, 'all-us-stocks.json');
      
      if (!fs.existsSync(stocksFile)) {
        return res.json([]);
      }
      
      let stocks = JSON.parse(fs.readFileSync(stocksFile, 'utf8'));
      
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
      console.error('Error:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  appServer.post('/api/cache/clear', (req, res) => {
    res.json({ success: true });
  });
  
  // Servir frontend
  appServer.use(express.static(path.join(__dirname, 'dist')));
  appServer.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
  
  return appServer;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    title: 'Stock Screener Pro',
    backgroundColor: '#1a1f2e',
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);
  
  // Abrir DevTools para debugging
  mainWindow.webContents.openDevTools();
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const expressApp = createServer();
  
  server = expressApp.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving from: ${path.join(__dirname, 'dist')}`);
    console.log(`📊 Data file: ${path.join(__dirname, 'all-us-stocks.json')}`);
    
    // Verificar que el archivo de datos existe
    const dataExists = require('fs').existsSync(path.join(__dirname, 'all-us-stocks.json'));
    console.log(`📈 Data file exists: ${dataExists}`);
    
    createWindow();
  });
  
  server.on('error', (err) => {
    console.error('❌ Server error:', err);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
