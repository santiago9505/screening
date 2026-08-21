import React, { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol: string;
  theme?: 'light' | 'dark';
}

declare global {
  interface Window {
    TradingView: any;
  }
}

const CHART_SESSION_OVERRIDES = {
  'mainSeriesProperties.sessionId': 'regular',
  'mainSeriesProperties.prePostMarket.visible': false,
  'scalesProperties.showPrePostMarketPriceLabel': false,
};

const DISABLED_TRADINGVIEW_FEATURES = [
  'pre_post_market_price_line',
  'support_overnight_session',
];

const enforceChartSession = (widget: any) => {
  try {
    widget?.applyOverrides?.(CHART_SESSION_OVERRIDES);
  } catch {}
};

const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol, theme = 'dark' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const containerIdRef = useRef<string>(`tv_${Math.random().toString(36).slice(2)}`);

  // Convert Yahoo Finance symbol to TradingView format
  const convertSymbol = (yahooSymbol: string): string => {
    const symbolMap: Record<string, string> = {
      '^GSPC': 'SPX',
      '^DJI': 'DJI',
      '^IXIC': 'NASDAQ:IXIC',
      '^NDX': 'NASDAQ:NDX',
      '^RUT': 'TVC:RUT',
      '^VIX': 'CBOE:VIX',
      '^TNX': 'TVC:US10Y',
      'GC=F': 'COMEX:GC1!',
      'CL=F': 'NYMEX:CL1!',
      'ES=F': 'CME_MINI:ES1!',
    };

    if (symbolMap[yahooSymbol]) return symbolMap[yahooSymbol];
    if (yahooSymbol.includes('-USD')) {
      return `COINBASE:${yahooSymbol.replace('-USD', '')}USD`;
    }
    return yahooSymbol;
  };

  useEffect(() => {
    let mounted = true;

    const loadScript = () => {
      return new Promise<void>((resolve) => {
        if (window.TradingView) {
          resolve();
          return;
        }

        const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
        if (existingScript) {
          const interval = setInterval(() => {
            if (window.TradingView) {
              clearInterval(interval);
              resolve();
            }
          }, 100);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    const initWidget = async () => {
      await loadScript();
      if (!mounted || !containerRef.current) return;

      // First time create widget
      if (!widgetRef.current) {
        containerRef.current.id = containerIdRef.current;
        try {
          if (!window.TradingView?.widget) return;
          const widget = new window.TradingView.widget({
            autosize: true,
            symbol: convertSymbol(symbol),
            interval: 'D',
            timezone: 'America/New_York',
            theme: theme,
            style: '0',
            locale: 'es',
            toolbar_bg: theme === 'dark' ? '#0c1118' : '#f1f3f6',
            enable_publishing: false,
            withdateranges: true,
            hide_side_toolbar: false,
            allow_symbol_change: true,
            container_id: containerIdRef.current,
            disabled_features: DISABLED_TRADINGVIEW_FEATURES,
            extended_hours: false,
            doNotStoreSettings: true,
            studies: [
              { id: 'MASimple@tv-basicstudies', inputs: { length: 50 } },
              { id: 'MASimple@tv-basicstudies', inputs: { length: 150 } },
              { id: 'MASimple@tv-basicstudies', inputs: { length: 200 } }
            ],
            overrides: {
              'mainSeriesProperties.barStyle.upColor': '#26a69a',
              'mainSeriesProperties.barStyle.downColor': '#ef5350',
              'paneProperties.background': theme === 'dark' ? '#080c12' : '#ffffff',
              'paneProperties.backgroundType': 'solid',
              'paneProperties.vertGridProperties.color': 'rgba(255, 255, 255, 0.035)',
              'paneProperties.horzGridProperties.color': 'rgba(255, 255, 255, 0.035)',
              'scalesProperties.textColor': '#788599',
              ...CHART_SESSION_OVERRIDES
            }
          });
          widgetRef.current = widget;
          if (widget.onChartReady) {
            widget.onChartReady(() => {
              try { widget.activeChart()?.setChartType(0); } catch {}
              enforceChartSession(widget);
            });
          }
          // Observe container resize once
          if (window.ResizeObserver && !resizeObserverRef.current) {
            resizeObserverRef.current = new ResizeObserver(() => {
              if (!containerRef.current || !widgetRef.current?.resize) return;
              const r = containerRef.current.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                try { widgetRef.current.resize(r.width, r.height); } catch {}
              }
            });
            resizeObserverRef.current.observe(containerRef.current);
          }
        } catch (e) {
          console.error('Error init TradingView widget:', e);
        }
      } else {
        // Update symbol without recreating widget
        try {
          const chart = widgetRef.current.activeChart && widgetRef.current.activeChart();
          if (chart && chart.setSymbol) {
            chart.setSymbol(convertSymbol(symbol));
            enforceChartSession(widgetRef.current);
          } else {
            // Fallback: recreate if chart API missing
            widgetRef.current = null;
            containerRef.current.innerHTML = '';
            initWidget();
            return;
          }
        } catch (e) {
          console.warn('Failed to update symbol, recreating widget', e);
          widgetRef.current = null;
          containerRef.current.innerHTML = '';
          initWidget();
        }
      }
    };

    initWidget();

    return () => {
      mounted = false;
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (e) {
          // Ignore
        }
        widgetRef.current = null;
      }
      if (resizeObserverRef.current) {
        try { resizeObserverRef.current.disconnect(); } catch {}
        resizeObserverRef.current = null;
      }
    };
  }, [symbol, theme]);

  return <div ref={containerRef} className="w-full h-full" />;
};

export default TradingViewChart;
