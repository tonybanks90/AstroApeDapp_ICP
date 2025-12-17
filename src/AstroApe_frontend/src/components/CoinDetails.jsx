import React from "react";

const CoinDetails = ({ tokenMetadata, curveStats }) => {
  if (!tokenMetadata) {
    return <div className="text-n-4 text-center">Loading details...</div>;
  }

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

  const formatPrice = (price) => {
    if (!price) return "-";
    const p = Number(price);
    if (p < 0.00001) return p.toExponential(2);
    return p.toFixed(6);
  };

  const formatMarketCap = (cap) => {
    if (!cap) return "-";
    const num = Number(cap);
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  // Calculate bonding progress
  const bondedProgress = curveStats
    ? Math.min(Number(curveStats.progress_to_graduation) * 100, 100).toFixed(2) + "%"
    : "0%";

  const currentPrice = curveStats ? formatPrice(curveStats.current_price) : "-";
  const marketCap = curveStats ? formatMarketCap(curveStats.market_cap) : "-";
  const tokensMinted = curveStats ? formatSupply(curveStats.tokens_minted) : "-";
  const totalRaised = curveStats ? formatSupply(curveStats.total_base_raised) : "-";

  return (
    <div className="bg-n-8 rounded-lg p-3 space-y-3">
      {/* Prices */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Price (sats)</p>
          <p className="font-semibold text-color-1">{currentPrice}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Market Cap</p>
          <p className="font-semibold">{marketCap}</p>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Tokens Minted</p>
          <p className="font-semibold text-sm text-green-400">{tokensMinted}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Total Raised</p>
          <p className="font-semibold text-sm">{totalRaised} sats</p>
        </div>
      </div>

      {/* Other Details */}
      <div className="grid grid-cols-3 gap-2">
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Decimals</p>
          <p className="font-semibold">{Number(tokenMetadata.decimals)}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Total Supply</p>
          <p className="font-semibold text-sm">{formatSupply(tokenMetadata.total_supply)}</p>
        </div>
        <div className="border border-n-6 rounded-lg p-2 text-center">
          <p className="text-xs text-n-3">Created</p>
          <p className="font-semibold text-xs mt-1">{formatDate(tokenMetadata.created_at)}</p>
        </div>
      </div>

      {/* Bonding Progress */}
      <div className="flex flex-col gap-1 items-start border border-n-6 rounded-lg p-2">
        <div className="w-full bg-n-6 rounded-full h-2 relative">
          <div
            className="h-2 bg-color-1 rounded-full transition-all duration-300"
            style={{ width: bondedProgress }}
          ></div>
        </div>
        <p className="text-n-1 text-[11px]">{bondedProgress} Complete (Bonding Curve)</p>
        {curveStats?.is_graduated && (
          <span className="text-xs text-green-400 font-bold">🎓 GRADUATED!</span>
        )}
      </div>
    </div>
  );
};

export default CoinDetails;

