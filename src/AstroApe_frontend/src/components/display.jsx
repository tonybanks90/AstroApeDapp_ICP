import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory, canisterId } from "../../../declarations/TokenFactory";
import { FiExternalLink, FiGlobe, FiMessageCircle } from "react-icons/fi";
import { FaTwitter } from "react-icons/fa";

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

const TokenCard = ({ tokenId, metadata }) => {
  const formatSupply = (supply) => {
    const num = Number(supply);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) / 1000000).toLocaleDateString();
  };

  const getLogoSrc = (logoData) => {
    if (logoData.ImageUrl) {
      return logoData.ImageUrl;
    }
    // Handle ImageBlob if needed
    return null;
  };

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300">
      {/* Header with Logo and Basic Info */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 bg-n-7 rounded-full flex items-center justify-center overflow-hidden">
          {getLogoSrc(metadata.logo) ? (
            <img
              src={getLogoSrc(metadata.logo)}
              alt={`${metadata.name} logo`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-n-4 text-xl font-bold">
              {metadata.symbol.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-n-1">{metadata.name}</h3>
            <span className="text-sm bg-color-1 text-white px-2 py-1 rounded">
              {metadata.symbol}
            </span>
          </div>
          <p className="text-sm text-n-3 font-mono">
            {tokenId.toString()}
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <p className="text-n-2 text-sm leading-relaxed">
          {metadata.description || "No description available"}
        </p>
      </div>

      {/* Token Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-n-7 rounded-md">
        <div>
          <p className="text-xs text-n-4 uppercase tracking-wide">Total Supply</p>
          <p className="text-lg font-semibold text-n-1">
            {formatSupply(metadata.total_supply)}
          </p>
        </div>
        <div>
          <p className="text-xs text-n-4 uppercase tracking-wide">Decimals</p>
          <p className="text-lg font-semibold text-n-1">
            {Number(metadata.decimals)}
          </p>
        </div>
        <div>
          <p className="text-xs text-n-4 uppercase tracking-wide">Fee</p>
          <p className="text-lg font-semibold text-n-1">
            {Number(metadata.fee).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-n-4 uppercase tracking-wide">Created</p>
          <p className="text-lg font-semibold text-n-1">
            {formatDate(metadata.created_at)}
          </p>
        </div>
      </div>

      {/* Social Links */}
      <div className="flex items-center gap-3">
        {metadata.website && metadata.website[0] && (
          <a
            href={metadata.website[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-n-3 hover:text-color-1 transition-colors"
          >
            <FiGlobe className="w-4 h-4" />
            <span className="text-sm">Website</span>
          </a>
        )}

        {metadata.twitter && metadata.twitter[0] && (
          <a
            href={metadata.twitter[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-n-3 hover:text-color-1 transition-colors"
          >
            <FaTwitter className="w-4 h-4" />
            <span className="text-sm">Twitter</span>
          </a>
        )}

        {metadata.telegram && metadata.telegram[0] && (
          <a
            href={metadata.telegram[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-n-3 hover:text-color-1 transition-colors"
          >
            <FiMessageCircle className="w-4 h-4" />
            <span className="text-sm">Telegram</span>
          </a>
        )}
      </div>

      {/* Minting Account Info */}
      <div className="mt-4 pt-4 border-t border-n-6">
        <p className="text-xs text-n-4 uppercase tracking-wide mb-1">Minting Account</p>
        <p className="text-xs font-mono text-n-3 break-all">
          {metadata.minting_account.owner.toString()}
        </p>
      </div>
    </div>
  );
};

const Display = () => {
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

      // Provide more specific error messages
      let errorMessage = "Failed to fetch tokens";
      if (err.message?.includes("Failed to fetch") || err.message?.includes("CONNECTION_REFUSED")) {
        errorMessage = "Cannot connect to the Internet Computer network. Please check your connection or try again later.";
      } else if (err.message?.includes("Canister") || err.message?.includes("not found")) {
        errorMessage = "Token factory canister not found. Please verify the canister ID.";
      } else {
        errorMessage = `Failed to fetch tokens: ${err.message || "Unknown error"}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchTokens();
  };

  if (loading) {
    return (
      <div className="lg:pt-20 p-2 mb-12 lg:px-32">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-color-1 mx-auto mb-4"></div>
            <p className="text-n-3">Loading tokens...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:pt-20 p-2 mb-12 lg:px-32">
        <div className="text-center py-20">
          <div className="text-6xl text-n-6 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-n-2 mb-4">Connection Error</h2>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4 max-w-md mx-auto">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-color-1 text-white rounded-md hover:bg-color-1/80 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                setError("");
                setTokens([]);
              }}
              className="px-4 py-2 bg-n-7 text-n-1 rounded-md hover:bg-n-6 transition-colors"
            >
              Clear Error
            </button>
          </div>
          <div className="mt-4 text-sm text-n-4">
            <p>If this error persists:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Check your internet connection</li>
              <li>Verify the canister ID is correct</li>
              <li>Try refreshing the page</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:pt-20 p-2 mb-12 lg:px-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-n-1">Launched Tokens</h1>
          <p className="text-n-3 mt-2">
            {tokens.length} token{tokens.length !== 1 ? 's' : ''} deployed
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-n-7 text-n-1 rounded-md hover:bg-n-6 transition-colors"
        >
          <FiExternalLink className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tokens Grid */}
      {tokens.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl text-n-6 mb-4">🚀</div>
          <h2 className="text-xl font-semibold text-n-2 mb-2">No tokens deployed yet</h2>
          <p className="text-n-4">Create your first token to see it displayed here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tokens.map(([tokenId, metadata]) => (
            <Link key={tokenId.toString()} to={`/Token/swap/${tokenId.toString()}`}>
              <TokenCard
                tokenId={tokenId}
                metadata={metadata}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Display;