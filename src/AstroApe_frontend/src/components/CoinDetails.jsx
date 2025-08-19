import React from "react";
import tokenData from "../data/dataToken";

const CoinDetails = ({ tokenId }) => {
  const coininfo = tokenData.find((token) => token.id === Number(tokenId));
  const token = tokenData.find((t) => t.id === Number(tokenId));
  const bondedProgress = token?.bonded || "0%";

  if (!coininfo) {
    return <div className="text-red-500 text-center">Token not found</div>;
  }

  return (
    <div className="bg-n-8 rounded-lg p-3 space-y-3">
      {/* Prices */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Price USD</p>
          <p className="font-semibold">{coininfo.priceUSD}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Price</p>
          <p className="font-semibold">{coininfo.priceSats}</p>
        </div>
      </div>

      {/* Price Changes */}
      <div className="grid grid-cols-4 gap-2">
        {Object.entries(coininfo.changes).map(([time, change]) => (
          <div key={time} className="border border-n-6 rounded-lg p-2 text-center">
            <p className="text-xs text-n-3">{time.toUpperCase()}</p>
            <p className={`font-semibold text-sm ${change.includes("-") ? "text-red-500" : "text-green-500"}`}>
              {change}
            </p>
          </div>
        ))}
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Market Cap</p>
          <p className="font-semibold text-sm">
            {coininfo.marketCap.btc} ({coininfo.marketCap.usd})
          </p>
        </div>
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Volume</p>
          <p className="font-semibold text-sm">
            {coininfo.volume.btc} ({coininfo.volume.usd})
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">TXNS</p>
          <p className="font-semibold">{coininfo.transactions.total}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-2 text-center">
          {/* Placeholder for Buys/Sells */}
        </div>
      </div>

      {/* Other Details */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Holders</p>
          <p className="font-semibold">{coininfo.holders}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Supply</p>
          <p className="font-semibold">{coininfo.supply}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Created</p>
          <p className="font-semibold">{coininfo.created}</p>
        </div>
      </div>

      {/* Bonding Progress */}
      <div className="flex flex-col gap-1 items-start border border-n-6 rounded-lg p-2">
        <div className="w-full bg-n-6 rounded-full h-2 relative">
          <div
            className="h-2 bg-color-1 rounded-full transition-all duration-300"
            style={{ width: bondedProgress }}
          ></div>
        </div>
        <p className="text-n-1 text-[11px]">{bondedProgress} Complete</p>
      </div>
    </div>
  );
};

export default CoinDetails;
