import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

// Timeframe options in seconds
const TIMEFRAMES = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

// Convert trades to OHLC candles
const tradesToCandles = (trades, timeframeSeconds) => {
  if (!trades || trades.length === 0) {
    return generateMockData(50, timeframeSeconds);
  }

  // Sort trades by timestamp
  const sortedTrades = [...trades].sort((a, b) =>
    Number(a.timestamp) - Number(b.timestamp)
  );

  // Group trades into candles
  const candles = new Map();

  sortedTrades.forEach(trade => {
    // Convert nanoseconds to seconds
    const timestamp = Math.floor(Number(trade.timestamp) / 1000000000);
    const candleTime = Math.floor(timestamp / timeframeSeconds) * timeframeSeconds;
    const price = Number(trade.price);
    const volume = Number(trade.amount_in);
    const isBuy = Object.keys(trade.trade_type)[0] === 'buy';

    if (!candles.has(candleTime)) {
      candles.set(candleTime, {
        time: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volume,
        buyVolume: isBuy ? volume : 0,
        sellVolume: isBuy ? 0 : volume,
      });
    } else {
      const candle = candles.get(candleTime);
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      candle.volume += volume;
      if (isBuy) {
        candle.buyVolume += volume;
      } else {
        candle.sellVolume += volume;
      }
    }
  });

  // Convert to array and sort
  let candleArray = Array.from(candles.values()).sort((a, b) => a.time - b.time);

  // If we have very few candles, fill in gaps for better visualization
  if (candleArray.length < 10 && candleArray.length > 0) {
    const filledCandles = [];
    const lastPrice = candleArray[candleArray.length - 1].close;
    const firstTime = candleArray[0].time;
    const now = Math.floor(Date.now() / 1000);

    // Add some historical mock data before first trade
    for (let t = firstTime - timeframeSeconds * 20; t < firstTime; t += timeframeSeconds) {
      const mockPrice = lastPrice * (0.95 + Math.random() * 0.1);
      filledCandles.push({
        time: t,
        open: mockPrice,
        high: mockPrice * 1.01,
        low: mockPrice * 0.99,
        close: mockPrice,
        volume: Math.floor(Math.random() * 1000) + 100,
        buyVolume: Math.floor(Math.random() * 500),
        sellVolume: Math.floor(Math.random() * 500),
      });
    }

    // Add actual candles
    filledCandles.push(...candleArray);

    candleArray = filledCandles;
  }

  return candleArray.map(c => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    value: c.volume,
    color: c.buyVolume >= c.sellVolume ? '#26a69a' : '#ef5350',
  }));
};

// Generate mock data for when no trades exist
const generateMockData = (count, timeframeSeconds) => {
  const data = [];
  let time = Math.floor(Date.now() / 1000) - count * timeframeSeconds;
  let price = 100;

  for (let i = 0; i < count; i++) {
    const volatility = 2;
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 1000) + 100;
    const color = close >= open ? '#26a69a' : '#ef5350';

    data.push({
      time: time + i * timeframeSeconds,
      open,
      high,
      low,
      close,
      value: volume,
      color,
    });

    price = close;
  }
  return data;
};

const TradingChart = ({ tokenId, tokenMetadata, trades }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [timeframe, setTimeframe] = useState('1h');

  // Convert trades to candles based on timeframe
  const data = useMemo(() => {
    return tradesToCandles(trades, TIMEFRAMES[timeframe]);
  }, [trades, timeframe]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0E0C15' },
        textColor: '#DDD',
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#C3BCDB44',
          style: 0,
          labelBackgroundColor: '#9B7DFF',
        },
        horzLine: {
          color: '#9B7DFF',
          labelBackgroundColor: '#9B7DFF',
        },
      },
      timeScale: {
        borderColor: '#2B2B43',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    candleSeriesRef.current = candleSeries;

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update data when trades or timeframe changes
  useEffect(() => {
    if (candleSeriesRef.current && volumeSeriesRef.current && data.length > 0) {
      const candleData = data.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }));
      const volumeData = data.map(({ time, value, color }) => ({ time, value, color }));

      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    }
  }, [data]);

  const lastCandle = data.length > 0 ? data[data.length - 1] : { open: 0, high: 0, low: 0, close: 0 };

  return (
    <div className="w-full bg-[#0E0C15] rounded-xl border border-n-6 overflow-hidden shadow-lg">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-n-6 bg-[#0E0C15]">
        <div className="flex items-center gap-2">
          {tokenMetadata && tokenMetadata.logo && tokenMetadata.logo.ImageUrl && (
            <img src={tokenMetadata.logo.ImageUrl} alt="logo" className="w-6 h-6 rounded-full" />
          )}
          <span className="text-n-1 font-bold text-lg">
            {tokenMetadata ? `${tokenMetadata.symbol}/ckBTC` : 'TOKEN/ckBTC'}
          </span>
          {trades && trades.length > 0 && (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
              {trades.length} trades
            </span>
          )}
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1">
          {Object.keys(TIMEFRAMES).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-1 text-xs rounded transition-all ${timeframe === tf
                  ? 'bg-color-1 text-white'
                  : 'bg-n-7 text-n-3 hover:bg-n-6 hover:text-n-1'
                }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* OHLC Display */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs font-mono text-n-3 border-b border-n-6 bg-[#0E0C15]/50">
        <span className="text-color-1">O: {lastCandle.open.toFixed(4)}</span>
        <span className="text-green-400">H: {lastCandle.high.toFixed(4)}</span>
        <span className="text-red-400">L: {lastCandle.low.toFixed(4)}</span>
        <span className={lastCandle.close >= lastCandle.open ? 'text-green-400' : 'text-red-400'}>
          C: {lastCandle.close.toFixed(4)}
        </span>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="w-full h-[500px]" />
    </div>
  );
};

export default TradingChart;
