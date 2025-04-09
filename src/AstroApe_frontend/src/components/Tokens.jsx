import React from "react";
import tokenData from "../data/dataToken"; // Import token data

const Tokens = () => {
  // Hardcoded to show only ID 1 for now
  const token = tokenData.find((t) => t.id === 1);
  if (!token) return <p className="text-n-1 text-center">No data found.</p>;

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-6 shadow-lg">
      {/* Table Header */}
      <div className="grid grid-cols-8 gap-4 pb-4 border-b border-n-6 text-n-2 text-sm font-medium uppercase">
        <div>TOKEN</div>
        <div>OWNED</div>
        <div>VALUE</div>
        <div>CREATED</div>
        <div>MKT CAP</div>
        <div>VOLUME</div>
        <div>TXNS</div>
        <div>BONDED</div>
      </div>

      {/* Table Row */}
      <div className="grid grid-cols-8 gap-4 py-4 border-b border-n-6 items-center">
        {/* Token Info */}
        <div className="flex items-center gap-3">
          <img src={token.logo} alt={token.name} className="w-10 h-10 rounded-full" />
          <div>
            <p className="text-n-1 font-semibold">{token.name}</p>
            <p className="text-n-3 text-xs">{token.ticker}</p>
          </div>
        </div>

        {/* Owned */}
        <div>
          <p className="text-n-1 font-medium">{token.owned.tickeramount}</p>
          <p className="text-n-3 text-xs">{token.owned.tickerpercent}</p>
        </div>

        {/* Value */}
        <div>
          <p className="text-n-1 font-medium">{token.value.btcvalue}</p>
          <p className="text-n-3 text-xs">{token.value.usdvalue}</p>
        </div>

        {/* Created */}
        <div className="text-n-1 font-medium">{token.created}</div>

        {/* Market Cap */}
        <div>
          <p className="text-n-1 font-medium">{token.marketCap.btc}</p>
          <p className="text-n-3 text-xs">{token.marketCap.usd}</p>
        </div>

        {/* Volume */}
        <div>
          <p className="text-n-1 font-medium">{token.volume.btc}</p>
          <p className="text-n-3 text-xs">{token.volume.usd}</p>
        </div>

        {/* Transactions */}
        <div>
          <p className="text-n-1 font-medium">{token.transactions.total}</p>
          <div className="flex gap-2 text-xs">
            <p className="text-green-400">+{token.transactions.buys}</p>
            <p className="text-red-400">-{token.transactions.sells}</p>
          </div>
        </div>

        {/* Bonded */}
        <div className="flex flex-col gap-2 items-start">
          <div className="w-full bg-n-6 rounded-full h-2 relative">
            <div
              className="h-2 bg-purple-500 rounded-full"
              style={{ width: token.bonded }}
            ></div>
          </div>
          <p className="text-n-1 text-xs">{token.bonded}</p>
        </div>
      </div>
    </div>
  );
};

export default Tokens;
