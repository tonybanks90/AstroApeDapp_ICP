import React, { useState } from "react";
import Button from "./Button"; // Assuming you have a Button component

const ConnectWallet = () => {
  const [selectedChain, setSelectedChain] = useState(null);
  const [walletOptions, setWalletOptions] = useState([]);

  const handleSelectChain = (chain) => {
    setSelectedChain(chain);
    if (chain === "Ethereum") {
      setWalletOptions(["MetaMask", "WalletConnect"]);
    } else if (chain === "Internet Computer") {
      setWalletOptions(["Plug Wallet", "NFID"]);
    }
  };

  const handleConnectWallet = (wallet) => {
    if (wallet === "MetaMask") {
      // Connect to MetaMask
      if (window.ethereum) {
        window.ethereum.request({ method: 'eth_requestAccounts' });
      } else {
        alert("MetaMask not installed!");
      }
    } else if (wallet === "WalletConnect") {
      // Connect to WalletConnect (assuming you have the integration)
      // Implement WalletConnect integration here
      alert("WalletConnect integration not implemented yet.");
    } else if (wallet === "Plug Wallet") {
      // Connect to Plug Wallet
      // Implement Plug Wallet integration here
      alert("Plug Wallet integration not implemented yet.");
    } else if (wallet === "NFID") {
      // Connect to NFID
      // Implement NFID integration here
      alert("NFID integration not implemented yet.");
    }
  };

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-6 shadow-lg mt-8">
      <h2 className="text-2xl font-bold text-n-1 mb-4">Connect Wallet</h2>

      {selectedChain ? (
        <div>
          <h3 className="text-lg font-semibold text-n-1 mb-4">Select Wallet</h3>
          {walletOptions.map((wallet, index) => (
            <Button key={index} onClick={() => handleConnectWallet(wallet)} className="mb-4">
              {wallet}
            </Button>
          ))}
          <Button onClick={() => setSelectedChain(null)} className="mt-4">
            Back
          </Button>
        </div>
      ) : (
        <div>
          <Button onClick={() => handleSelectChain("Ethereum")} className="mb-4">
            Connect to Ethereum
          </Button>
          <Button onClick={() => handleSelectChain("Internet Computer")} className="mb-4">
            Connect to Internet Computer
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConnectWallet;
