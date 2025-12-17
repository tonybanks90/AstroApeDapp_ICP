import React from 'react';

const Trades = ({ trades }) => {
  const formatTime = (nanoTimestamp) => {
    // Convert nanoseconds to milliseconds
    const date = new Date(Number(nanoTimestamp) / 1000000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatPrice = (price) => {
    return Number(price).toFixed(8);
  };

  return (
    <div className="overflow-x-auto p-2">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-gray-300 text-left border-b border-gray-700">
            <th className="p-3">Time</th>
            <th className="p-3">Type</th>
            <th className="p-3">In</th>
            <th className="p-3">Out</th>
            <th className="p-3">Price</th>
            <th className="p-3">Maker</th>
          </tr>
        </thead>
        <tbody>
          {trades && trades.length > 0 ? (
            trades
              .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
              .map((trade, index) => (
                <tr key={index} className="border-b border-gray-700 text-gray-400 hover:bg-gray-800 transition-all">
                  <td className="p-3 text-xs">{formatTime(trade.timestamp)}</td>
                  <td className={`p-3 font-bold text-xs ${Object.keys(trade.trade_type)[0] === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                    {Object.keys(trade.trade_type)[0].toUpperCase()}
                  </td>
                  <td className="p-3 text-xs">{Number(trade.amount_in)}</td>
                  <td className="p-3 text-xs">{Number(trade.amount_out)}</td>
                  <td className="p-3 text-xs">{formatPrice(trade.price)}</td>
                  <td className="p-3 text-xs text-color-1 truncate max-w-[100px]">
                    {trade.user.toString()}
                  </td>
                </tr>
              ))
          ) : (
            <tr>
              <td colSpan="6" className="p-3 text-center text-gray-500">No trades available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Trades;
