import React from 'react';

const Trades = ({ trades }) => {
  return (
    <div className="flex-1 bg-gray-900 p-4 rounded-lg">
      <h2 className="text-lg font-bold mb-4">Recent Trades</h2>
      <div className="space-y-2">
        {trades.map((trade) => (
          <div key={trade.id} className="flex justify-between p-2 border border-gray-700 rounded-lg">
            <span>{trade.time}</span>
            <span>{trade.type}</span>
            <span>{trade.amount}</span>
            <span>{trade.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Trades;
