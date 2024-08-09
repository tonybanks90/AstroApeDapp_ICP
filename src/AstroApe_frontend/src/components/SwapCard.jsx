import React from "react";
import ChatAndTrades from "./ChatAndTrades";
import TokenDistributionCard from "./TokenDistributionCard";
import TradingViewChart from "./TradingViewChart";
import SwapComponent from "./SwapComponent"; // Import SwapComponent
import CoinDetails from "./CoinDetails"; // Import CoinDetails
import WrapCoin from "./WrapCoin"; // Import WrapCoin
import WrapCoinContainer from "./WrapCoinContainer";

const SwapAndDistribution = () => {
  return (
    <div className="mt-20 w-full mx-auto px-4 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[80vh]">
        {/* CoinDetails - Above TradingView Chart */}
        <div className="lg:col-span-2 bg-n-8 border border-n-6 rounded-lg p-4 h-full">
          <CoinDetails />
        </div>

        {/* WrapCoin - Above SwapComponent */}
        <div className="bg-n-8 border border-n-6 rounded-lg p-6">
          <WrapCoinContainer /> 
        </div>

        {/* TradingView Chart - Below CoinDetails */}
        <div className="lg:col-span-2 bg-n-8 border border-n-6 rounded-lg p-4 h-full">
          <TradingViewChart />
        </div>

        {/* Swap Component - Below WrapCoin */}
        <div className="bg-n-8 border border-n-6 rounded-lg p-6 h-full">
          <SwapComponent />
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
