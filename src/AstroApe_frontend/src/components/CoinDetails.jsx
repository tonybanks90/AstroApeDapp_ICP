import React from "react";
import tokenData from "../data/dataToken";

const CoinDetails = ({ tokenId }) => {
  const coininfo = tokenData.find((token) => token.id === Number(tokenId));

  if (!coininfo) {
    return <div className="text-red-500 text-center">Token not found</div>;
  }

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-4">
      {/* Coin Information */}
      <div className="border border-n-6 rounded-lg p-4 flex items-center space-x-4">
        <img src={coininfo.logo} alt="Logo" className="w-16 h-16 border border-n-6 rounded-lg" />
        <div>
          <h2 className="text-xl font-bold text-n-1">{coininfo.name}</h2>
          <p className="text-n-3">{coininfo.tagline}</p>
        </div>
      </div>

      {/* Social Icons */}
      <div className="mt-4 flex space-x-4 justify-center">
        {coininfo.icons && (
          <>
            <a href={coininfo.twitterlink} target="_blank" rel="noopener noreferrer" className="text-n-3 hover:text-n-1">
              <img src={coininfo.icons.twitter} alt="Twitter" className="w-6 h-6" />
            </a>
            <a href={coininfo.telegramlink} target="_blank" rel="noopener noreferrer" className="text-n-3 hover:text-n-1">
              <img src={coininfo.icons.telegram} alt="Telegram" className="w-6 h-6" />
            </a>
            <a href={coininfo.websitelink} target="_blank" rel="noopener noreferrer" className="text-n-3 hover:text-n-1">
              <img src={coininfo.icons.website} alt="Website" className="w-6 h-6" />
            </a>
          </>
        )}
      </div>

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
          <p className="text-n-3">Buys / Sells</p>
          <p className="font-bold text-green-500">{coininfo.transactions.buys}</p> / 
          <p className="font-bold text-red-500">{coininfo.transactions.sells}</p>
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
      <div className="mt-4 text-center text-green-500 font-bold border border-n-6 rounded-lg p-4">
        Dev: {coininfo.dev}
      </div>
    </div>
  );
};

export default CoinDetails;
