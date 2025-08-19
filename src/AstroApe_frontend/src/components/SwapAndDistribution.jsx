import { useParams } from "react-router-dom";
import React, { useState } from "react";
import ChatAndTrades from "./ChatAndTrades";
import TokenDistributionCard from "./TokenDistributionCard";
import SwapComponent from "./SwapComponent";
import CoinDetails from "./CoinDetails";
import CandlestickChart from "./CandlestickChart";
import MenuBar from "./Menubar";
import Tokentopdetails from "./Tokentopdetails";
import TradingChart from "./TradingChart";

const SwapAndDistribution = () => {
  const { tokenId } = useParams();
  const [showSwap, setShowSwap] = useState(false);

  return (
    <>
      {/* Desktop Layout */}
      <div className="lg:mt-14 mb-16 w-full mx-auto px-4 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Section */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Tokentopdetails tokenId={tokenId} />
            {/*<CandlestickChart tokenId={tokenId} />*/}
            <TradingChart />
            <ChatAndTrades />
          </div>

          {/* Right Section */}
          <div className="flex flex-col gap-4">
            <CoinDetails tokenId={tokenId} />
            <div className="hidden lg:block">
              <SwapComponent tokenId={tokenId} />
            </div>
            {/*<TokenDistributionCard tokenId={tokenId} />*/}
          </div>
        </div>
      </div>

      {/* Swap Button - Small Screens Only */}
      <div className="z-40 lg:hidden fixed bottom-16 left-0 w-full p-2">
        <button
          onClick={() => setShowSwap(true)}
          className="w-full bg-color-1 text-white py-4 shadow-lg rounded-md hover:bg-purple-700 transition"
        >
          Swap
        </button>
      </div>

      {/* Mobile Swap Component Overlay */}
      {showSwap && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center lg:hidden">
          <div className="w-full max-w-md px-4">
            <SwapComponent tokenId={tokenId} onClose={() => setShowSwap(false)} />
          </div>
        </div>
      )}

      <MenuBar />
    </>
  );
};

export default SwapAndDistribution;
