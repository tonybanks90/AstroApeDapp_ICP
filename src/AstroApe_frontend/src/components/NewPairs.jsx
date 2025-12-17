import React, { useState, useEffect } from "react";
import Input from "./Input";
import Button from "./Button";
import PairCard from "./PairCard";
import { FiTrendingUp, FiFlag } from "react-icons/fi";
import { FaRocket, FaCrown } from "react-icons/fa";
import { Link } from "react-router-dom";
import MenuSvg from "../assets/svg/MenuSvg";
import Guide from "./Guide";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/TokenFactory";

const chains = ["All", "ETH", "BTC"];

// Setup agent + actor for TokenFactory
const createTokenFactoryActor = async () => {
  // Default to mainnet unless explicitly set to local
  const isLocal = process.env.DFX_NETWORK === "local" || process.env.NODE_ENV === "development";

  const agent = new HttpAgent({
    host: isLocal ? "http://127.0.0.1:4943" : "https://icp-api.io"
  });

  // Only fetch root key in local development and handle errors
  if (isLocal) {
    try {
      await agent.fetchRootKey();
      console.log("✅ Connected to local replica");
    } catch (err) {
      console.warn("⚠️ Couldn't connect to local replica, falling back to mainnet");
      console.error(err);

      // Create new agent for mainnet
      const mainnetAgent = new HttpAgent({
        host: "https://icp-api.io"
      });

      return Actor.createActor(idlFactory, {
        agent: mainnetAgent,
        canisterId: process.env.CANISTER_ID_TOKENFACTORY,
      });
    }
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: process.env.CANISTER_ID_TOKENFACTORY,
  });
};

const NewPairs = () => {
  const [selectedChain, setSelectedChain] = useState("All");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBondedExpanded, setIsBondedExpanded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSort, setActiveSort] = useState("New"); // New, Trending, Top MC, Old

  // Data fetching state
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      setError("");

      const tokenFactory = await createTokenFactoryActor();
      const result = await tokenFactory.getAllTokensMetadata();
      setTokens(result);
    } catch (err) {
      console.error("Error fetching tokens:", err);
      let errorMessage = "Failed to fetch tokens";
      if (err.message?.includes("Failed to fetch") || err.message?.includes("CONNECTION_REFUSED")) {
        errorMessage = "Cannot connect to the Internet Computer network.";
      } else if (err.message?.includes("Canister")) {
        errorMessage = "Token factory canister not found.";
      } else {
        errorMessage = `Failed to fetch tokens: ${err.message || "Unknown error"}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAndSortedTokens = () => {
    let filtered = [...tokens];

    // 1. Filter by Chain
    if (selectedChain !== "All") {
      filtered = filtered.filter(([_, metadata]) => {
        if (selectedChain === "BTC") return "Bitcoin" in metadata.chain_type;
        if (selectedChain === "ETH") return "Ethereum" in metadata.chain_type;
        return true;
      });
    }

    // 2. Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(([_, metadata]) =>
        metadata.name.toLowerCase().includes(q) ||
        metadata.symbol.toLowerCase().includes(q)
      );
    }

    // 3. Sort
    filtered.sort((a, b) => {
      const metaA = a[1];
      const metaB = b[1];

      switch (activeSort) {
        case "New": // Sort by created_at desc
          return Number(metaB.created_at) - Number(metaA.created_at);
        case "Old": // Sort by created_at asc
          return Number(metaA.created_at) - Number(metaB.created_at);
        case "Top MC": // Sort by total_supply desc (proxy)
          return Number(metaB.total_supply) - Number(metaA.total_supply);
        case "Trending": // For now, random or specific priority, let's allow 'New' as fallback
          return Number(metaB.created_at) - Number(metaA.created_at);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const formatSupply = (supply) => {
    const num = Number(supply);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  const getLogoSrc = (logoData) => {
    if (logoData && logoData.ImageUrl) {
      return logoData.ImageUrl;
    }
    return null;
  };

  const displayTokens = getFilteredAndSortedTokens();

  return (
    <div className="lg:mt-9 mb-12 p-6">

      {/* --- Top Row --- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        {/* ✅ Left Side Text (only visible on large screens) */}
        <div className="hidden lg:block text-white">
          <h1 className="text-lg font-semibold">Trade Memecoins,</h1>
          <h3 className="text-lg font-semibold text-color-1">Discover the most trending tokens</h3>
        </div>

        {/* ✅ Right Side Buttons */}
        <div className="flex justify-center lg:justify-end gap-3">
          {/* How it works */}
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="px-4 py-2 rounded-md bg-color-1 text-white border border-transparent hover:border-white transition font-bold text-sm"
          >
            How it works
          </button>

          {/* Launch Token */}
          <Link to="/Token/2">
            <button
              type="button"
              className="px-4 py-2 rounded-md bg-color-1 text-white border border-transparent hover:border-white transition font-bold text-sm"
            >
              Launch Token
            </button>
          </Link>
        </div>
      </div>


      {/* --- Filters + Search Row --- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
        {/* Left Section - Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Select Chain Button */}
          <div className="relative">
            <Button
              className="px-4 py-2 text-white rounded-md"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {selectedChain} ▼
            </Button>
            {isDropdownOpen && (
              <div className="absolute z-40 left-0 mt-2 bg-gray-900 text-white shadow-lg rounded-md w-full border border-color-1">
                {chains.map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    className={`px-4 py-2 border rounded-md w-full text-left ${selectedChain === chain
                      ? "bg-color-1 text-white"
                      : "bg-n-8 text-n-1"
                      }`}
                    onClick={() => {
                      setSelectedChain(chain);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {chain}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Other Buttons */}
          <Button
            className={`text-white flex items-center gap-2 ${activeSort === "Trending" ? "bg-color-1" : ""}`}
            onClick={() => setActiveSort("Trending")}
          >
            <FiTrendingUp /> Trending
          </Button>
          <Button
            className={`text-white flex items-center gap-2 ${activeSort === "Top MC" ? "bg-color-1" : ""}`}
            onClick={() => setActiveSort("Top MC")}
          >
            <FaCrown /> Top MC
          </Button>
          <Button
            className={`text-white flex items-center gap-2 ${activeSort === "New" ? "bg-color-1" : ""}`}
            onClick={() => setActiveSort("New")}
          >
            <FaRocket /> New
          </Button>

          {/* Bonded Button */}
          <div className="relative">
            <Button
              className="text-white flex items-center gap-2 px-4 py-2 rounded-md"
              onClick={() => setIsBondedExpanded(!isBondedExpanded)}
            >
              <FiFlag /> Bonded
            </Button>
            {isBondedExpanded && (
              <div className="absolute left-0 z-40 mt-2 w-48 bg-[#1e1e1e] text-white rounded-xl border border-color-1 shadow-2xl">
                {["Top MC", "New", "Old"].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full px-4 py-2 border rounded-md bg-n-8 text-n-1 hover:bg-color-1 hover:text-white transition-colors duration-200 text-left"
                    onClick={() => {
                      setActiveSort(item);
                      setIsBondedExpanded(false);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Search & Toggle */}
        <div className="flex items-center gap-3">
          <Input
            id="search"
            name="search"
            type="text"
            placeholder="Search for pairs..."
            className="w-full lg:w-72"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <MenuSvg />
        </div>
      </div>

      {/* --- Pairs Grid --- */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-color-1"></div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red-500">
          <p>{error}</p>
        </div>
      ) : displayTokens.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-n-3">
          <p>No tokens found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayTokens.map(([tokenId, metadata]) => (
            <PairCard
              key={tokenId.toString()}
              id={tokenId.toString()}
              logo={getLogoSrc(metadata.logo) || "https://placehold.co/400"}
              name={metadata.name}
              xmarketCap={formatSupply(metadata.total_supply)} // Using Supply as placeholder for MarketCap
              numReplies={0}
              ticker={metadata.symbol}
            />
          ))}
        </div>
      )}

      {/* --- Guide Modal --- */}
      {showGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-n-8 p-6 rounded-xl max-w-lg w-full relative">
            {/* Guide handles its own close buttons */}
            <Guide onClose={() => setShowGuide(false)} />
          </div>
        </div>
      )}

    </div>
  );
};

export default NewPairs;
