import React from 'react';
import tradeData from '../data/tradeData';

const Trades = () => {
  // Hardcoded ID for now, will modify to use props later
  const hardcodedId = '2';

  // Ensure tradeData contains the ID and is an array before using it
  const filteredTrades = Array.isArray(tradeData[hardcodedId]) ? tradeData[hardcodedId] : [];

  return (
    <div className="overflow-x-auto p-2">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-gray-300 text-left border-b border-gray-700">
            <th className="p-3">Date</th>
            <th className="p-3">Type</th>
            <th className="p-3">ETH</th>
            <th className="p-3">USD</th>
            <th className="p-3">AMT</th>
            <th className="p-3">Price</th>
            <th className="p-3">Maker</th>
          </tr>
        </thead>
        <tbody>
          {filteredTrades.length > 0 ? (
            filteredTrades.map((trade, index) => (
              <tr key={index} className="border-b border-gray-700 text-gray-400 hover:bg-gray-800 transition-all">
                <td className="p-3 text-xs">{trade.time}</td>
                <td className={`p-3 font-bold text-xs ${trade.type === 'Buy' ? 'text-green-400' : 'text-red-400'}`}>{trade.type}</td>
                <td className="p-3 text-xs">{trade.eth}</td>
                <td className="p-3 text-xs">{trade.usd}</td>
                <td className="p-3 text-xs">{trade.amt}</td>
                <td className="p-3 text-xs">{trade.price}</td>
                <td className="p-3 text-xs text-blue-400">{trade.maker}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="p-3 text-center text-gray-500">No trades available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Trades;
