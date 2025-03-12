import React, { useState } from 'react';
import tradeData from '../data/tradeData';

const Trades = () => {
  const [tradesPerPage, setTradesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(tradeData.length / tradesPerPage);
  const displayedTrades = tradeData.slice((currentPage - 1) * tradesPerPage, currentPage * tradesPerPage);

  return (
    <div className="overflow-hidden">
      <div className="mb-2 flex justify-between items-center">
        <label className="text-white text-sm">Show 
          <select 
            value={tradesPerPage} 
            onChange={(e) => setTradesPerPage(Number(e.target.value))} 
            className="ml-2 p-1 bg-gray-800 text-white border border-gray-600 rounded">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select> trades
        </label>
      </div>
      
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-800 text-gray-300 text-left">
            <th className="p-2">Date</th>
            <th className="p-2">Type</th>
            <th className="p-2">BTC</th>
            <th className="p-2">USD</th>
            <th className="p-2">AMT</th>
            <th className="p-2">Price</th>
            <th className="p-2">Maker</th>
          </tr>
        </thead>
        <tbody>
          {displayedTrades.map((trade, index) => (
            <tr key={index} className="border-t border-gray-700 text-gray-400 hover:bg-gray-800 transition-all">
              <td className="p-2 text-xs">{trade.time}</td>
              <td className={`p-2 font-bold text-xs ${trade.type === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>{trade.type}</td>
              <td className="p-2 text-xs">{trade.btc}</td>
              <td className="p-2 text-xs">{trade.usd}</td>
              <td className="p-2 text-xs">{trade.amt}</td>
              <td className="p-2 text-xs">{trade.price}</td>
              <td className="p-2 text-xs text-blue-400">{trade.maker}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="flex justify-between items-center mt-2">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
          disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50">
          Previous Page
        </button>
        <span className="text-white">Page {currentPage} of {totalPages}</span>
        <button 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50">
          Next Page
        </button>
      </div>
    </div>
  );
};

export default Trades;
