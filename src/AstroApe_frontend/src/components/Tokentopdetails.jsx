import React, { useState } from "react";
import { Copy, Share2, Star } from "lucide-react"; // icons

const Tokentopdetails = ({ tokenMetadata }) => {
  const [copied, setCopied] = useState(false);

  if (!tokenMetadata) {
    return <div className="text-red-500 text-center">Loading token details...</div>;
  }

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getLogoSrc = (logoData) => {
    if (logoData?.ImageUrl) return logoData.ImageUrl;
    return null;
  };

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Coin Logo + Info */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 border border-n-6 rounded-lg overflow-hidden bg-n-7 flex items-center justify-center">
            {getLogoSrc(tokenMetadata.logo) ? (
              <img
                src={getLogoSrc(tokenMetadata.logo)}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-n-4">{tokenMetadata.symbol.substring(0, 1)}</span>
            )}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-n-1">
              {tokenMetadata.name}
            </h2>
            <p className="text-n-3 text-sm">{tokenMetadata.symbol}</p>
          </div>
        </div>

        {/* Right: Socials + Actions */}
        <div className="flex items-center gap-3">
          {/* Social Links */}
          <div className="flex gap-2">
            {tokenMetadata.website && tokenMetadata.website[0] && (
              <a
                href={tokenMetadata.website[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-n-3 hover:text-n-1 p-2 rounded-md border border-n-6"
                title="Website"
              >
                🌐
              </a>
            )}
            {tokenMetadata.twitter && tokenMetadata.twitter[0] && (
              <a
                href={tokenMetadata.twitter[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-n-3 hover:text-n-1 p-2 rounded-md border border-n-6"
                title="Twitter"
              >
                🐦
              </a>
            )}
            {tokenMetadata.telegram && tokenMetadata.telegram[0] && (
              <a
                href={tokenMetadata.telegram[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-n-3 hover:text-n-1 p-2 rounded-md border border-n-6"
                title="Telegram"
              >
                ✈️
              </a>
            )}
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-2 rounded-md border border-n-6 text-n-3 hover:text-n-1 hover:bg-n-6 transition"
          >
            <Share2 size={18} />
          </button>
          {/* Star Button */}
          <button
            className="p-2 rounded-md border border-n-6 text-n-3 hover:text-yellow-400 hover:bg-n-6 transition"
          >
            <Star size={18} />
          </button>
        </div>
      </div>

      {/* Dev Info */}
      <div className="mt-3 text-center sm:text-left text-color-1 font-semibold border border-n-6 rounded-md px-3 py-2 text-sm flex items-center gap-2">
        <span className="text-n-3">Creator:</span>
        <span className="font-mono text-xs truncate max-w-[200px] sm:max-w-none">
          {tokenMetadata.minting_account.owner.toString()}
        </span>
      </div>

      {/* Copy Toast */}
      {copied && (
        <p className="text-xs text-green-400 mt-2 text-center sm:text-right">
          Link copied!
        </p>
      )}
    </div>
  );
};

export default Tokentopdetails;
