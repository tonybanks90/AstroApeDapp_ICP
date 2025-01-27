import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { candlestickData } from '../data/chartData'; // Import the data

const CandlestickChart = () => {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart instance
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.offsetWidth,
      height: 400,
      layout: {
        backgroundColor: '#131722',
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 1, // Normal mode
      },
      priceScale: {
        borderColor: '#485c7b',
      },
      timeScale: {
        borderColor: '#485c7b',
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#4caf50',
      downColor: '#f44336',
      borderDownColor: '#f44336',
      borderUpColor: '#4caf50',
      wickDownColor: '#f44336',
      wickUpColor: '#4caf50',
    });

    // Set the data from the imported file
    candlestickSeries.setData(candlestickData);

    // Resize chart on window resize
    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current.offsetWidth,
      });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div className="mt-20 p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">Candlestick Chart</h1>
        <p className="text-lg text-gray-400">
          Visualize market data with our dynamic candlestick chart.
        </p>
      </header>
      <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
};

export default CandlestickChart;
