import React, { useState } from "react";
import ChatAndTrades from "./ChatAndTrades";
import TokenDistributionCard from "./TokenDistributionCard";
import TradingViewChart from "./TradingViewChart";

const SwapAndDistribution = () => {
  const [tokenFrom, setTokenFrom] = useState("APE");
  const [tokenTo, setTokenTo] = useState("ckETH");
  const [amount, setAmount] = useState("");

  const handleSwap = () => {
    alert(`Swapping ${amount} ${tokenFrom} to ${tokenTo}`);
  };

  return (
    <div className="mt-20 w-full mx-auto px-4 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[80vh]">
        {/* TradingView Chart - Top 70% */}
        <div className="lg:col-span-2 bg-n-8 border border-n-6 rounded-lg p-4 h-full">
          <TradingViewChart />
        </div>

        {/* Swap Component - Top 30% */}
        <div className="bg-n-8 border border-n-6 rounded-lg p-6 h-full">
          <h2 className="text-2xl font-bold text-n-1 mb-6">Swap Tokens</h2>
          <div className="mb-4">
            <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="tokenFrom">
              From
            </label>
            <select
              id="tokenFrom"
              className="w-full p-2 border border-n-6 rounded bg-n-9 text-n-1"
              value={tokenFrom}
              onChange={(e) => setTokenFrom(e.target.value)}
            >
              <option value="APE">APE</option>
              <option value="ckETH">ckETH</option>
              <option value="ICP">ICP</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="tokenTo">
              To
            </label>
            <select
              id="tokenTo"
              className="w-full p-2 border border-n-6 rounded bg-n-9 text-n-1"
              value={tokenTo}
              onChange={(e) => setTokenTo(e.target.value)}
            >
              <option value="APE">APE</option>
              <option value="ckETH">ckETH</option>
              <option value="ICP">ICP</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="amount">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              className="w-full p-2 border border-n-6 rounded bg-n-9 text-n-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button
            className="bg-blue-500 text-white py-2 px-4 rounded w-full"
            onClick={handleSwap}
          >
            Swap
          </button>
        </div>

        {/* Chat and Trades - Bottom 70% */}
        <div className="lg:col-span-2 mt-4 lg:mt-0 bg-n-8 border border-n-6 rounded-lg p-4 h-full">
          <ChatAndTrades />
        </div>

        {/* Token Distribution Card - Bottom 30% */}
        <div className="mt-4 lg:mt-0 bg-n-8 border border-n-6 rounded-lg p-4 h-full">
          <TokenDistributionCard />
        </div>
      </div>
    </div>
  );
};

export default SwapAndDistribution;
