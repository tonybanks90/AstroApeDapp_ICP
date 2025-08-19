import React, { useState } from "react";
import { Copy, Share2, Star } from "lucide-react"; // icons
import tokenData from "../data/dataToken";

const Tokentopdetails = ({ tokenId }) => {
  const coininfo = tokenData.find((token) => token.id === Number(tokenId));
  const [copied, setCopied] = useState(false);

  if (!coininfo) {
    return <div className="text-red-500 text-center">Token not found</div>;
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

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left: Coin Logo + Info */}
        <div className="flex items-center gap-3">
          <img
            src={coininfo.logo}
            alt="Logo"
            className="w-14 h-14 border border-n-6 rounded-lg"
          />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-n-1">
              {coininfo.name}
            </h2>
            <p className="text-n-3 text-sm">{coininfo.ticker}</p>
          </div>
        </div>

        {/* Right: Socials + Actions */}
        <div className="flex items-center gap-3">
          {coininfo.icons && (
            <>
              <a
                href={coininfo.twitterlink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-n-3 hover:text-n-1"
              >
                <img
                  src={coininfo.icons.twitter}
                  alt="Twitter"
                  className="w-5 h-5"
                />
              </a>
              <a
                href={coininfo.telegramlink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-n-3 hover:text-n-1"
              >
                <img
                  src={coininfo.icons.telegram}
                  alt="Telegram"
                  className="w-5 h-5"
                />
              </a>
              <a
                href={coininfo.websitelink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-n-3 hover:text-n-1"
              >
                <img
                  src={coininfo.icons.website}
                  alt="Website"
                  className="w-5 h-5"
                />
              </a>
            </>
          )}
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
      <div className="mt-3 text-center sm:text-left text-color-1 font-semibold border border-n-6 rounded-md px-3 py-2 text-sm">
        Dev: {coininfo.dev}
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
