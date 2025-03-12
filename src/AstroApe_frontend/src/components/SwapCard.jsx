import React, { useState } from "react";
import ChatAndTrades from "./ChatAndTrades";
import TokenDistributionCard from "./TokenDistributionCard";
import TradingViewChart from "./TradingViewChart";
import SwapComponent from "./SwapComponent";
import CoinDetails from "./CoinDetails";
import CandlestickChart from "./CandlestickChart";
import MenuBar from "../components/MenuBar";

const SwapAndDistribution = () => {
  const [showSwap, setShowSwap] = useState(false);
  const [activeTab, setActiveTab] = useState("info"); // "info" or "charts"

  return (
    <>
      <div className="mt-10 w-full mx-auto px-4 lg:px-8 pb-20">
        {/* Small Screen Toggle */}
        <div className="lg:hidden flex justify-center space-x-4 mb-4">
          <button
            className={`px-4 py-2 rounded-md text-sm ${
              activeTab === "info" ? "bg-purple-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setActiveTab("info")}
          >
            Info
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm ${
              activeTab === "charts" ? "bg-purple-600 text-white" : "bg-gray-200"
            }`}
            onClick={() => setActiveTab("charts")}
          >
            Charts
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Side */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {activeTab === "charts" && <CandlestickChart />}
            {(activeTab === "info" || window.innerWidth >= 1024) && <CoinDetails />}
            <ChatAndTrades />
          </div>

          {/* Right Side */}
          <div className="flex flex-col gap-4">
            <TokenDistributionCard />
            {window.innerWidth >= 1024 && <SwapComponent />}
          </div>
        </div>
      </div>

      {/* Floating Swap Button - Small Screens Only */}
      <div className="lg:hidden fixed bottom-16 left-0 w-full p-2">
        <button
          onClick={() => setShowSwap(true)}
          className="w-full bg-purple-600 text-white py-4 shadow-lg rounded-md hover:bg-purple-700 transition"
        >
          Swap
        </button>
      </div>

      {/* SwapComponent - Slides Up like Telegram */}
      <div
        className={`fixed inset-x-0 bottom-0 bg-gray-900 text-white transition-transform duration-300 ease-in-out transform ${
          showSwap ? "translate-y-0" : "translate-y-full"
        } w-full h-[85vh] rounded-t-2xl shadow-lg flex flex-col`}
      >
        {/* Close Button */}
        <button
          onClick={() => setShowSwap(false)}
          className="absolute top-4 right-4 text-white text-3xl font-bold"
        >
          ✕
        </button>

        {/* SwapComponent Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <SwapComponent />
        </div>
      </div>

      <MenuBar />
    </>
  );
};

export default SwapAndDistribution;
