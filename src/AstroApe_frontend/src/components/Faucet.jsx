import React, { useState } from "react";
import ClaimFaucet from "../components/ClaimFaucet";
import { SiBitcoin, SiEthereum } from "react-icons/si";

const Faucet = () => {
  const [activeTab, setActiveTab] = useState("ckSepoliaETH");

  const tabs = [
    { 
      id: "ckSepoliaETH", 
      label: "ckSepoliaETH", 
      icon: SiEthereum,
      color: "from-blue-500 to-purple-600",
      hoverColor: "hover:border-blue-500/50",
      activeColor: "border-blue-500 bg-blue-500/10"
    },
    { 
      id: "SepoliaETH", 
      label: "Sepolia ETH", 
      icon: SiEthereum,
      color: "from-blue-500 to-cyan-500",
      hoverColor: "hover:border-cyan-500/50",
      activeColor: "border-cyan-500 bg-cyan-500/10"
    },
    { 
      id: "ckBTC", 
      label: "ckBTC", 
      icon: SiBitcoin,
      color: "from-orange-500 to-yellow-600",
      hoverColor: "hover:border-orange-500/50",
      activeColor: "border-orange-500 bg-orange-500/10"
    },
    { 
      id: "BTC", 
      label: "Bitcoin Testnet", 
      icon: SiBitcoin,
      color: "from-orange-500 to-amber-600",
      hoverColor: "hover:border-amber-500/50",
      activeColor: "border-amber-500 bg-amber-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-n-8 lg:pt-24 pt-20 pb-16 px-4 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            AstroApe <span className="bg-gradient-to-r from-color-1 to-color-2 bg-clip-text text-transparent">Testnet</span> Faucet
          </h1>
          <p className="text-n-3 text-lg max-w-2xl mx-auto">
            Claim free testnet tokens to experiment with AstroApe's multichain tools. 
            Test Bitcoin and Ethereum integrations without spending real funds.
          </p>
        </div>

        {/* Token Selection Tabs */}
        <div className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-4 border-2 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? `${tab.activeColor} scale-105 shadow-lg` 
                      : `border-n-6 bg-n-7 ${tab.hoverColor}`
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Icon className={`text-2xl ${
                      isActive 
                        ? tab.id.includes("BTC") ? "text-orange-400" : "text-blue-400"
                        : "text-n-4"
                    }`} />
                    <span className={`font-semibold text-sm ${
                      isActive ? "text-n-1" : "text-n-3"
                    }`}>
                      {tab.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Claim Component */}
        {activeTab && <ClaimFaucet activeTab={activeTab} />}

        {/* Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-n-7 border border-n-6 rounded-xl p-6">
            <h3 className="text-lg font-bold text-n-1 mb-3">📋 How to Use</h3>
            <ul className="space-y-2 text-sm text-n-3">
              <li>1. Select your desired testnet token</li>
              <li>2. Connect your wallet or enter address</li>
              <li>3. Click claim to receive tokens</li>
              <li>4. Wait 24 hours before claiming again</li>
            </ul>
          </div>
          
          <div className="bg-n-7 border border-n-6 rounded-xl p-6">
            <h3 className="text-lg font-bold text-n-1 mb-3">⚠️ Important Notes</h3>
            <ul className="space-y-2 text-sm text-n-3">
              <li>• Testnet tokens have no real value</li>
              <li>• One claim per address every 24 hours</li>
              <li>• Use for testing purposes only</li>
              <li>• Bitcoin addresses must be testnet format</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Faucet;