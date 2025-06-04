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
    <div className="bg-n-8  rounded-lg ">
      
      {/* Coin Information */}
     

      {/* Social Icons */}
      

      {/* Prices */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="border border-n-6 rounded-lg p-4 text-center">
          <p className="text-n-3">Price USD</p>
          <p className="font-bold">{coininfo.priceUSD}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-4 text-center">
          <p className="text-n-3">Price</p>
          <p className="font-bold">{coininfo.priceSats}</p>
        </div>
      </div>

      {/* Price Changes */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        {Object.entries(coininfo.changes).map(([time, change]) => (
          <div key={time} className="border border-n-6 rounded-lg p-4 text-center">
            <p className="text-n-3">{time.toUpperCase()}</p>
            <p className={`font-bold ${change.includes("-") ? "text-red-500" : "text-green-500"}`}>{change}</p>
          </div>
        ))}
      </div>

      {/* Market Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="border border-n-6 rounded-lg p-4 text-center">
          <p className="text-n-3">Market Cap</p>
          <p className="font-bold">{coininfo.marketCap.btc} ({coininfo.marketCap.usd})</p>
        </div>
        <div className="border border-n-6 rounded-lg p-4 text-center">
          <p className="text-n-3">Volume</p>
          <p className="font-bold">{coininfo.volume.btc} ({coininfo.volume.usd})</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="border border-n-6 rounded-lg p-4 text-center">
          <p className="text-n-3">TXNS</p>
          <p className="font-bold">{coininfo.transactions.total}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-4 text-center">
          {/*<p className="text-n-3">Buys / Sells</p>
          <p className="font-bold text-green-500">{coininfo.transactions.buys}</p> / 
          <p className="font-bold text-red-500">{coininfo.transactions.sells}</p>*/}
        </div>
      </div>

      {/* Other Details */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="border border-n-6 rounded-lg p-4 text-center">
          <p className="text-n-3">Holders</p>
          <p className="font-bold">{coininfo.holders}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-4 text-center">
          <p className="text-n-3">Supply</p>
          <p className="font-bold">{coininfo.supply}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-4 text-center">
          <p className="text-n-3">Created</p>
          <p className="font-bold">{coininfo.created}</p>
        </div>
      </div>

      {/* Dev */}
       {/* Bonding Progress */}
      <div className="mt-4 text-center flex flex-col gap-2 items-start font-bold border border-n-6 rounded-lg p-4">
        <div className="w-full bg-n-6 rounded-full h-2 relative">
          <div
            className="h-2 bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: bondedProgress }}
          ></div>
        </div>
        <p className="text-n-1 text-xs">{bondedProgress} Complete</p>
      </div>

      
    </div>
  );
};

export default CoinDetails;
