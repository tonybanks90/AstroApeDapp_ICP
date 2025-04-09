import React from "react";

const xPairCard = ({ imageSrc, tokenName, ticker, created, marketCap, priceSats, changes, volume, transactions, ascended, socialLinks }) => {
  return (
    <div className="bg-n-8 p-4 rounded-lg shadow-lg flex flex-col">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <img src={imageSrc} alt={tokenName} className="w-10 h-10 rounded-full" />
          <div>
            <h2 className="text-lg font-bold text-n-1">{tokenName} <span className="text-n-3">{ticker}</span></h2>
            <p className="text-sm text-n-4">{created} ago</p>
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-6 text-sm text-n-2 gap-2 py-2">
        <span>Mkt Cap</span>
        <span>5m</span>
        <span>1h</span>
        <span>6h</span>
        <span>24h</span>
        <span>Vol</span>
      </div>
      <div className="grid grid-cols-6 text-sm text-n-1 font-semibold gap-2">
        <span>{marketCap.usd}</span>
        <span className={changes["5m"].includes("-") ? "text-red-500" : "text-green-500"}>{changes["5m"]}</span>
        <span className={changes["1h"].includes("-") ? "text-red-500" : "text-green-500"}>{changes["1h"]}</span>
        <span className={changes["6h"].includes("-") ? "text-red-500" : "text-green-500"}>{changes["6h"]}</span>
        <span className={changes["24h"].includes("-") ? "text-red-500" : "text-green-500"}>{changes["24h"]}</span>
        <span>{volume.btc}</span>
      </div>

      {/* Transaction Data */}
      <div className="flex justify-between mt-3 text-sm">
        <span className="text-n-2">Txns: {transactions.total} ({transactions.buys}/{transactions.sells})</span>
        <span className="text-n-2">Ascended: {ascended}</span>
      </div>

      {/* Social Links */}
      <div className="flex space-x-3 mt-3">
        <a href={socialLinks.twitter} target="_blank" rel="noopener noreferrer">
          <img src="/assets/twitter.svg" alt="Twitter" className="w-5 h-5" />
        </a>
        <a href={socialLinks.telegram} target="_blank" rel="noopener noreferrer">
          <img src="/assets/telegram.svg" alt="Telegram" className="w-5 h-5" />
        </a>
        <a href={socialLinks.website} target="_blank" rel="noopener noreferrer">
          <img src="/assets/website.svg" alt="Website" className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
};

export default xPairCard;