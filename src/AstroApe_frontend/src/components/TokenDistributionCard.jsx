import React from "react";
import { candlestickData } from "../data/chartData"; // Import candlestick data

const TokenDistributionCard = ({ tokenId }) => {
  // Fetch distribution data for the selected tokenId
  const distributionData = candlestickData[tokenId]?.distribution || [];

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-n-1 mb-6">Token Distribution</h2>

      <div className="grid grid-cols-2 gap-4 border-b border-n-6 pb-2 mb-4">
        <span className="text-lg font-medium text-n-1">Holder Address</span>
        <span className="text-lg font-medium text-n-1">Distribution %</span>
      </div>

      <ul className="space-y-4">
        {distributionData.map((holder, index) => (
          <li
            key={index}
            className="grid grid-cols-2 gap-4 border-b border-n-6 pb-2"
          >
            <div className="flex items-center">
              <span className="text-n-1">{holder.address}</span>
              {holder.tag && (
                <span className="ml-2 bg-color-1 text-white text-xs px-2 py-1 rounded">
                  {holder.tag}
                </span>
              )}
            </div>
            <span className="text-n-1 text-right">{holder.percentage}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TokenDistributionCard;
