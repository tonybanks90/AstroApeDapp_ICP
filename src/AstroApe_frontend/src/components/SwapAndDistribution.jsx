import { useParams } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { useSiweIdentity } from "ic-use-siwe-identity"; // Import hook
import { idlFactory as tokenFactoryIdl } from "../../../declarations/TokenFactory";
import { idlFactory as bondingCurveIdl } from "../../../declarations/BondingCurve";
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
  const { identity } = useSiweIdentity(); // Get SIWE identity
  const [showSwap, setShowSwap] = useState(false);
  const [tokenMetadata, setTokenMetadata] = useState(null);
  const [trades, setTrades] = useState([]);
  const [holders, setHolders] = useState([]);
  const [curveStats, setCurveStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTokenData = async () => {
    try {
      setLoading(true);
      setError("");

      const isLocal = process.env.DFX_NETWORK === "local" || process.env.NODE_ENV === "development";
      const agent = new HttpAgent({
        host: isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io"
      });

      if (isLocal) {
        await agent.fetchRootKey().catch(console.error);
      }

      // Actor: TokenFactory
      const tokenFactory = Actor.createActor(tokenFactoryIdl, {
        agent,
        canisterId: process.env.CANISTER_ID_TOKENFACTORY,
      });

      // Actor: BondingCurve
      const bondingCurve = Actor.createActor(bondingCurveIdl, {
        agent,
        canisterId: process.env.CANISTER_ID_BONDINGCURVE,
      });

      // Parse tokenId
      let principalId;
      try {
        principalId = Principal.fromText(tokenId);
      } catch (e) {
        throw new Error("Invalid Token ID format");
      }

      // Fetch Metadata
      const metadata = await tokenFactory.getTokenMetadata(principalId);
      if (metadata.length > 0) {
        setTokenMetadata(metadata[0]);
      } else {
        setError("Token not found");
      }

      // Fetch Curve Stats
      try {
        const statsResult = await bondingCurve.get_curve_stats(principalId);
        if (statsResult.ok) {
          setCurveStats(statsResult.ok);
        } else {
          console.warn("Curve stats error:", statsResult.err);
        }
      } catch (e) {
        console.warn("Failed to fetch curve stats:", e);
      }

      // Fetch Trades
      try {
        const recentTrades = await bondingCurve.get_recent_trades(principalId);
        setTrades(recentTrades);
      } catch (e) {
        console.warn("Failed to fetch trades:", e);
      }

      // Fetch Holders
      try {
        const tokenHolders = await bondingCurve.get_holders(principalId);
        setHolders(tokenHolders);
      } catch (e) {
        console.warn("Failed to fetch holders:", e);
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load token data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenId) {
      fetchTokenData();
    }
  }, [tokenId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-color-1"></div>
      </div>
    );
  }

  if (error || !tokenMetadata) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-n-3">
        <p className="text-xl mb-4">⚠️ {error || "Token not found"}</p>
        <button
          onClick={() => window.location.href = '/Token/display'}
          className="px-4 py-2 bg-color-1 text-white rounded hover:bg-opacity-80"
        >
          Back to Tokens
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Layout */}
      <div className="lg:mt-14 mb-16 w-full mx-auto px-4 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Section */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <Tokentopdetails tokenMetadata={tokenMetadata} tokenId={tokenId} />
            {/*<CandlestickChart tokenId={tokenId} />*/}
            <TradingChart tokenId={tokenId} tokenMetadata={tokenMetadata} trades={trades} />
            <ChatAndTrades trades={trades} holders={holders} tokenId={tokenId} />
          </div>

          {/* Right Section */}
          <div className="flex flex-col gap-4">
            <CoinDetails tokenMetadata={tokenMetadata} tokenId={tokenId} curveStats={curveStats} />
            <div className="hidden lg:block">
              <SwapComponent tokenMetadata={tokenMetadata} tokenId={tokenId} identity={identity} />
            </div>
            <div className="hidden lg:block">
              <TokenDistributionCard holders={holders} />
            </div>
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
            <SwapComponent tokenMetadata={tokenMetadata} tokenId={tokenId} onClose={() => setShowSwap(false)} identity={identity} />
          </div>
        </div>
      )}

      <MenuBar />
    </>
  );
};

export default SwapAndDistribution;
