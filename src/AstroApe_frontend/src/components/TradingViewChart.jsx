// TradingViewChart.js
import React, { useEffect, useRef, useState } from 'react';
import { mockData } from '../data/mockData'; // Mock data for testing

const TradingViewChart = ({ pair = 'BTCUSD' }) => {
  const chartContainerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const scriptId = 'tradingview-widget-script';
    // Load the TradingView script dynamically if not already loaded
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Function to initialize TradingView once script is loaded
    const initializeTradingView = () => {
      if (window.TradingView) {
        const customDatafeed = {
          onReady: (callback) => {
            setTimeout(() => callback({ supports_time: true }), 0);
          },

          resolveSymbol: (symbolName, onSymbolResolvedCallback) => {
            const symbolInfo = {
              ticker: symbolName,
              name: symbolName,
              session: '24x7',
              timezone: 'Etc/UTC',
              minmov: 1,
              pricescale: 100,
              has_intraday: true,
              supported_resolutions: ['1', '5', '15', '30', '60', '1D'],
            };
            onSymbolResolvedCallback(symbolInfo);
          },

          getBars: (symbolInfo, resolution, from, to, onHistoryCallback, onErrorCallback) => {
            const data = mockData[symbolInfo.ticker];
            if (data) {
              const bars = data.map((bar) => ({
                time: bar.time * 1000, // Convert to milliseconds
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
              }));
              onHistoryCallback(bars, { noData: bars.length === 0 });
            } else {
              onErrorCallback('No data for the specified symbol');
            }
          },

          subscribeBars: (symbolInfo, resolution, onRealtimeCallback) => {
            // Simulate live updates if needed
          },

          unsubscribeBars: () => {
            // Clean up if necessary
          },
        };

        new window.TradingView.widget({
          container_id: 'tradingview-chart',
          width: '100%',
          height: 500,
          symbol: pair,
          interval: '15',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          datafeed: customDatafeed,
        });
      }
    };

    if (scriptLoaded) {
      initializeTradingView();
    }
  }, [scriptLoaded, pair]);

  return (
    <div ref={chartContainerRef}>
      <div id="tradingview-chart" />
    </div>
  );
};

export default TradingViewChart;
