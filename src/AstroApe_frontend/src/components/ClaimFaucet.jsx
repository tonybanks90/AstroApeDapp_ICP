import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useSiweIdentity } from "ic-use-siwe-identity";
import Input from "./Input";
import Button from "./Button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import LoginButton from "./login-button";

const ClaimFaucet = ({ activeTab }) => {
  const { isConnected, address: ethAddress } = useAccount();
  const { identity } = useSiweIdentity();

  const [userAddress, setUserAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Autofill wallet address based on activeTab
  useEffect(() => {
    if (activeTab === "SepoliaETH" && isConnected) {
      setUserAddress(ethAddress || "");
    } else if (activeTab === "ckSepoliaETH" && identity) {
      setUserAddress(identity.getPrincipal().toString());
    }
  }, [activeTab, isConnected, ethAddress, identity]);

  const handleClaim = async () => {
    if (!userAddress) return setMessage("Connect your wallet first.");
    setLoading(true);
    setMessage("");

    try {
      // Simulate claim process
      await new Promise((r) => setTimeout(r, 1500));
      setMessage(`${activeTab} successfully sent to ${userAddress}`);
    } catch (err) {
      setMessage("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const isWalletReady =
    (activeTab === "SepoliaETH" && isConnected) ||
    (activeTab === "ckSepoliaETH" && identity);

  return (
    <div className="bg-n-8 border border-n-6 rounded-2xl p-6 shadow-lg space-y-6">
      <h2 className="text-xl font-semibold text-color-1">
        Claim {activeTab}
      </h2>

      {!isWalletReady ? (
        <div className="space-y-4">
          <ConnectButton />
         
        </div>
      ) : (
        <>
          <Input
            value={userAddress}
            readOnly
            className="w-full bg-n-6 text-n-3 cursor-not-allowed"
          />

          <Button
            onClick={handleClaim}
            disabled={loading}
            className="bg-color-1 text-black font-bold w-full"
          >
            {loading ? "Claiming..." : `Claim ${activeTab}`}
          </Button>
        </>
      )}

      {message && (
        <div className="text-sm mt-2 text-center text-purple-400">
          {message}
        </div>
      )}
    </div>
  );
};

export default ClaimFaucet;
