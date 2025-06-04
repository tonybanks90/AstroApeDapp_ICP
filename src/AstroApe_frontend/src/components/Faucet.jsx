import React, { useState } from "react";
import Button from "../components/Button";
import ClaimFaucet from "../components/ClaimFaucet";

const Faucet = () => {
  const [activeTab, setActiveTab] = useState("ckSepoliaETH"); // <-- Default active tab

  return (
    <div className="bg-black border border-n-6 rounded-lg max-w-3xl mt-15 mx-auto px-4 py-20 text-white">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">
        AstroApe <span className="text-purple-500">Testnet</span> Faucet
      </h1>

      <p className="text-center text-sm md:text-base text-gray-400 mb-8">
        Claim free testnet tokens to experiment on Ethereum and ICP with AstroApe’s multichain tools. Use the faucet below to request either Sepolia ETH or ckSepoliaETH.
      </p>

      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
        <Button
          onClick={() => setActiveTab("ckSepoliaETH")}
          className={`font-bold w-full sm:w-auto ${
            activeTab === "ckSepoliaETH"
              ? "bg-color-1 text-white"
              : " hover:bg-purple-700"
          }`}
        >
          Get ckSepoliaETH
        </Button>

        <Button
          onClick={() => setActiveTab("SepoliaETH")}
          className={`font-bold w-full sm:w-auto ${
            activeTab === "SepoliaETH"
              ? "bg-purple-700 text-black"
              : " hover:bg-purple-700"
          }`}
        >
          Get SepoliaETH
        </Button>
      </div>

      {activeTab && <ClaimFaucet activeTab={activeTab} />}
    </div>
  );
};

export default Faucet;
