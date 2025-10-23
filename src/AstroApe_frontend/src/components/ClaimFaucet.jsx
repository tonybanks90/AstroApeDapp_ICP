import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useSiweIdentity } from "ic-use-siwe-identity";
import Input from "./Input";
import Button from "./Button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FiCheckCircle, FiAlertCircle, FiCopy, FiCheck } from "react-icons/fi";
import { SiBitcoin, SiEthereum } from "react-icons/si";

const ClaimFaucet = ({ activeTab }) => {
  const { isConnected, address: ethAddress } = useAccount();
  const { identity, login } = useSiweIdentity();

  const [userAddress, setUserAddress] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error, info
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txHash, setTxHash] = useState("");

  // Token configurations
  const tokenConfig = {
    "ckSepoliaETH": {
      name: "ckSepoliaETH",
      icon: SiEthereum,
      color: "from-blue-500 to-purple-600",
      borderColor: "border-blue-500/50",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400",
      amount: "0.5",
      needsConnection: true,
      usesPrincipal: true
    },
    "SepoliaETH": {
      name: "Sepolia ETH",
      icon: SiEthereum,
      color: "from-blue-500 to-cyan-500",
      borderColor: "border-cyan-500/50",
      bgColor: "bg-cyan-500/10",
      textColor: "text-cyan-400",
      amount: "0.1",
      needsConnection: true,
      usesPrincipal: false
    },
    "ckBTC": {
      name: "ckBTC",
      icon: SiBitcoin,
      color: "from-orange-500 to-yellow-600",
      borderColor: "border-orange-500/50",
      bgColor: "bg-orange-500/10",
      textColor: "text-orange-400",
      amount: "0.001",
      needsConnection: true,
      usesPrincipal: true
    },
    "BTC": {
      name: "Bitcoin Testnet",
      icon: SiBitcoin,
      color: "from-orange-500 to-amber-600",
      borderColor: "border-amber-500/50",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-400",
      amount: "0.01",
      needsConnection: false,
      usesPrincipal: false
    }
  };

  const currentToken = tokenConfig[activeTab] || tokenConfig["ckSepoliaETH"];

  // Autofill wallet address based on activeTab
  useEffect(() => {
    if (activeTab === "SepoliaETH" && isConnected) {
      setUserAddress(ethAddress || "");
    } else if ((activeTab === "ckSepoliaETH" || activeTab === "ckBTC") && identity) {
      setUserAddress(identity.getPrincipal().toString());
    } else if (activeTab === "BTC") {
      // BTC allows manual input
      setUserAddress("");
    } else {
      setUserAddress("");
    }
    // Reset messages when switching tabs
    setMessage("");
    setMessageType("");
    setTxHash("");
  }, [activeTab, isConnected, ethAddress, identity]);

  const validateBitcoinAddress = (address) => {
    // Simple Bitcoin testnet address validation (starts with m, n, or tb1)
    const testnetRegex = /^(m|n|tb1)[a-zA-Z0-9]{25,90}$/;
    return testnetRegex.test(address);
  };

  const handleClaim = async () => {
    if (!userAddress) {
      setMessage("Please enter or connect your wallet address.");
      setMessageType("error");
      return;
    }

    // Validate Bitcoin address for BTC tab
    if (activeTab === "BTC" && !validateBitcoinAddress(userAddress)) {
      setMessage("Invalid Bitcoin testnet address. Please enter a valid address starting with 'm', 'n', or 'tb1'.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");
    setTxHash("");

    try {
      // Simulate claim process with more realistic delay
      await new Promise((r) => setTimeout(r, 2000));
      
      // Generate mock transaction hash
      const mockTxHash = "0x" + Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      setTxHash(mockTxHash);
      setMessage(`Successfully sent ${currentToken.amount} ${currentToken.name} to your wallet!`);
      setMessageType("success");
    } catch (err) {
      setMessage("Failed to process claim. Please try again later.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWalletReady = () => {
    if (activeTab === "SepoliaETH") return isConnected;
    if (activeTab === "ckSepoliaETH" || activeTab === "ckBTC") return identity;
    if (activeTab === "BTC") return userAddress.length > 0;
    return false;
  };

  const Icon = currentToken.icon;

  return (
    <div className={`border-2 rounded-2xl p-6 lg:p-8 ${currentToken.borderColor} ${currentToken.bgColor} shadow-xl`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Icon className={`text-3xl ${currentToken.textColor}`} />
          <div>
            <h2 className="text-xl font-bold text-n-1">
              Claim {currentToken.name}
            </h2>
            <p className="text-sm text-n-4">Get {currentToken.amount} tokens for testing</p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!isWalletReady() && currentToken.needsConnection ? (
        <div className="space-y-6">
          <div className="bg-n-7 border border-n-6 rounded-xl p-6 text-center">
            <p className="text-n-3 mb-4">
              {currentToken.usesPrincipal 
                ? "Connect with SIWE to claim tokens to your Principal ID"
                : "Connect your wallet to claim testnet tokens"}
            </p>
            <div className="flex flex-col items-center space-y-3">
              <ConnectButton />
              {currentToken.usesPrincipal && !identity && (
                <button
                  onClick={login}
                  className="px-6 py-2 bg-color-1 hover:bg-color-1/90 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  Sign In with Ethereum
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Address Input */}
          <div>
            <label className="block text-sm font-semibold text-n-1/90 mb-2 uppercase tracking-wider">
              {activeTab === "BTC" ? "Bitcoin Testnet Address" : "Recipient Address"}
            </label>
            <div className="relative">
              <Input
                value={userAddress}
                onChange={(e) => activeTab === "BTC" && setUserAddress(e.target.value)}
                placeholder={
                  activeTab === "BTC" 
                    ? "Enter your Bitcoin testnet address (m..., n..., or tb1...)" 
                    : ""
                }
                readOnly={activeTab !== "BTC"}
                className={`w-full ${activeTab !== "BTC" ? 'bg-n-7 text-n-3 cursor-not-allowed' : 'bg-n-8 text-n-1'}`}
              />
              {userAddress && activeTab !== "BTC" && (
                <button
                  onClick={() => handleCopy(userAddress)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-n-4 hover:text-n-1 transition-colors"
                >
                  {copied ? <FiCheck className="text-green-400" /> : <FiCopy />}
                </button>
              )}
            </div>
            {activeTab === "BTC" && (
              <p className="text-xs text-n-4 mt-2">
                Enter a valid Bitcoin testnet address to receive funds
              </p>
            )}
          </div>

          {/* Claim Info */}
          <div className="bg-n-8/50 border border-n-6 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-n-4">Amount:</span>
              <span className={`font-bold ${currentToken.textColor}`}>
                {currentToken.amount} {currentToken.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-n-4">Cooldown:</span>
              <span className="text-n-2">24 hours</span>
            </div>
          </div>

          {/* Claim Button */}
          <Button
            onClick={handleClaim}
            disabled={loading || !isWalletReady()}
            className="w-full text-lg py-4 relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Processing...
                </>
              ) : (
                `Claim ${currentToken.amount} ${currentToken.name}`
              )}
            </span>
          </Button>

          {/* Messages */}
          {message && (
            <div className={`rounded-xl p-4 flex items-start space-x-3 ${
              messageType === "success" 
                ? "bg-green-500/10 border-2 border-green-500/30" 
                : messageType === "error"
                ? "bg-red-500/10 border-2 border-red-500/30"
                : "bg-blue-500/10 border-2 border-blue-500/30"
            }`}>
              {messageType === "success" ? (
                <FiCheckCircle className="text-green-400 text-xl flex-shrink-0 mt-0.5" />
              ) : messageType === "error" ? (
                <FiAlertCircle className="text-red-400 text-xl flex-shrink-0 mt-0.5" />
              ) : (
                <FiAlertCircle className="text-blue-400 text-xl flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  messageType === "success" ? "text-green-400" : 
                  messageType === "error" ? "text-red-400" : "text-blue-400"
                }`}>
                  {messageType === "success" ? "Success!" : messageType === "error" ? "Error" : "Info"}
                </p>
                <p className={`text-sm mt-1 ${
                  messageType === "success" ? "text-green-300/80" : 
                  messageType === "error" ? "text-red-300/80" : "text-blue-300/80"
                }`}>
                  {message}
                </p>
                {txHash && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs text-n-4">TX:</span>
                    <code className="text-xs text-n-3 bg-n-8 px-2 py-1 rounded">
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </code>
                    <button
                      onClick={() => handleCopy(txHash)}
                      className="text-n-4 hover:text-n-1"
                    >
                      {copied ? <FiCheck className="text-green-400" /> : <FiCopy />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClaimFaucet;