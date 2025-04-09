import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { candlestickData } from '../data/chartData'; // Import the updated data

const CandlestickChart = ({ tokenId }) => {
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

    // Ensure data is available for the selected tokenId
    const filteredData = Array.isArray(candlestickData[tokenId]?.chartData)
      ? candlestickData[tokenId].chartData
      : [];

    // Set the data for the candlestick chart
    candlestickSeries.setData(filteredData);

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
  }, [tokenId]);

  return (
    <div className="p-6 lg:p-8">
      <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />
    </div>
  );
};

export default CandlestickChart;
