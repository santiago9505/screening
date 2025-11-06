import React, { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';

interface TradingViewChartProps {
  symbol: string;
  theme?: 'light' | 'dark';
}

// Declare TradingView on window object for TypeScript
declare global {
  interface Window {
    TradingView: any;
  }
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol, theme = 'dark' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Convert Yahoo Finance symbol to TradingView format
  const convertSymbolToTradingView = (yahooSymbol: string): string => {
    // Índices: ^GSPC -> SPX, ^DJI -> DJI, ^IXIC -> IXIC, ^RUT -> RUT, ^VIX -> VIX, ^TNX -> US10Y
    if (yahooSymbol === '^GSPC') return 'SPX';
    if (yahooSymbol === '^DJI') return 'DJI';
    if (yahooSymbol === '^IXIC') return 'IXIC';
    if (yahooSymbol === '^NDX') return 'NDX';
    if (yahooSymbol === '^RUT') return 'RUT';
    if (yahooSymbol === '^VIX') return 'VIX';
    if (yahooSymbol === '^TNX') return 'US10Y';
    
    // Futuros
    if (yahooSymbol === 'GC=F') return 'GOLD';
    if (yahooSymbol === 'CL=F') return 'USOIL';
    
    // Crypto: BTC-USD -> BTCUSD
    if (yahooSymbol.includes('-USD')) {
      return yahooSymbol.replace('-USD', 'USD');
    }
    
    // ETFs y acciones normales: mantener como están (SPY, QQQ, VOO, XLE, IBIT, etc.)
    return yahooSymbol;
  };

  const tvSymbol = convertSymbolToTradingView(symbol);

  useEffect(() => {
    setIsLoading(true);
    
    // Cleanup previous widget
    if (widgetRef.current) {
      widgetRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Function to create widget
    const createWidget = () => {
      if (containerRef.current && window.TradingView) {
        setIsLoading(false);
        // Create new widget
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: 'D',
          timezone: 'America/New_York',
          theme: theme,
          style: '1',
          locale: 'es',
          toolbar_bg: theme === 'dark' ? '#1e222d' : '#f1f3f6',
          enable_publishing: false,
          withdateranges: true,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerRef.current.id,
          studies: [
            {
              id: "MASimple@tv-basicstudies",
              inputs: { length: 50 }
            },
            {
              id: "MASimple@tv-basicstudies", 
              inputs: { length: 150 }
            },
            {
              id: "MASimple@tv-basicstudies",
              inputs: { length: 200 }
            }
          ],
          disabled_features: [],
          enabled_features: [
            'header_widget',
            'header_symbol_search',
            'symbol_search_hot_key',
            'header_chart_type',
            'header_settings',
            'header_indicators',
            'header_compare',
            'header_undo_redo',
            'header_screenshot',
            'header_fullscreen_button',
            'timeframes_toolbar',
          ],
          overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#26a69a',
            'mainSeriesProperties.candleStyle.downColor': '#ef5350',
            'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
            'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
            'mainSeriesProperties.barStyle.upColor': '#26a69a',
            'mainSeriesProperties.barStyle.downColor': '#ef5350',
            'mainSeriesProperties.lineStyle.color': '#2962ff',
            'mainSeriesProperties.areaStyle.color1': '#2962ff',
            'mainSeriesProperties.areaStyle.color2': 'rgba(41, 98, 255, 0.1)',
            'paneProperties.background': theme === 'dark' ? '#131722' : '#ffffff',
            'paneProperties.backgroundType': 'solid',
          },
        });
      }
    };

    // Load TradingView script if not already loaded
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = createWidget;

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
    if (!existingScript) {
      document.head.appendChild(script);
    } else if (window.TradingView) {
      createWidget();
    }

    return () => {
      if (widgetRef.current) {
        widgetRef.current = null;
      }
    };
  }, [symbol, theme, tvSymbol]);

  return (
    <div className="tradingview-widget-container w-full h-full relative">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-300/50 z-10">
          <div className="text-center">
            <Loader className="animate-spin text-accent-blue mx-auto mb-2" size={40} />
            <p className="text-sm text-gray-400">Cargando gráfico...</p>
          </div>
        </div>
      )}

      {/* TradingView Chart - Ocupa todo el espacio */}
      <div
        ref={containerRef}
        id={`tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}`}
        className="w-full h-full"
      />
    </div>
  );
};

export default TradingViewChart;
