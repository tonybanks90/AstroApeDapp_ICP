// TradingViewChart.js
import React, { useEffect, useRef } from 'react';

const TradingViewChart = () => {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (chartContainerRef.current) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        new window.TradingView.widget({
          width: '100%',
          height: 500,
          symbol: 'BINANCE:ETHUSDT', // Example: ETH/USDT pair on Binance
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview-chart',
        });
      };
      chartContainerRef.current.appendChild(script);
    }
  }, []);

  return (
    <div ref={chartContainerRef}>
      <div id="tradingview-chart" />
    </div>
  );
};

export default TradingViewChart;
