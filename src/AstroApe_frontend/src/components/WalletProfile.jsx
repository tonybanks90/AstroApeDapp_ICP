import React from "react";
import { Link, useLocation } from "react-router-dom";
import Tokens from "./Tokens";
import Liquidity from "./Liquidity";
import Created from "./Created";
import Activity from "./Activity";

const WalletProfile = () => {
  const location = useLocation();  // Get current location (URL)
  const params = new URLSearchParams(location.search);  // Parse query parameters
  const tab = params.get("tab") || "tokens";
  // Get the value of the "tab" parameter

  return (
    <div className="mt-2 p-6 lg:p-8">
      <div className="bg-n-8 border border-n-6 rounded-lg p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-n-1 mb-4">Wallet Profile</h2>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Link
            to="/Token/profile?tab=tokens"
            className="px-6 py-3 text-lg bg-n-6 text-n-1 rounded-lg hover:bg-n-5 border border-n-6 transition-all duration-200 ease-in-out"
          >
            Tokens
          </Link>
          <Link
            to="/Token/profile?tab=liquidity"
            className="px-6 py-3 text-lg bg-n-6 text-n-1 rounded-lg hover:bg-n-5 border border-n-6 transition-all duration-200 ease-in-out"
          >
            Liquidity
          </Link>
          <Link
            to="/Token/profile?tab=created"
            className="px-6 py-3 text-lg bg-n-6 text-n-1 rounded-lg hover:bg-n-5 border border-n-6 transition-all duration-200 ease-in-out"
          >
            Created
          </Link>
          <Link
            to="/Token/profile?tab=activity"
            className="px-6 py-3 text-lg bg-n-6 text-n-1 rounded-lg hover:bg-n-5 border border-n-6 transition-all duration-200 ease-in-out"
          >
            Activity
          </Link>
        </div>

        <div className="bg-n-8 border border-n-6 rounded-lg p-6 shadow-lg">
          {/* Conditionally render the correct tab component */}
          {tab === "tokens" && <Tokens />}
          {tab === "liquidity" && <Liquidity />}
          {tab === "created" && <Created />}
          {tab === "activity" && <Activity />}
        </div>
      </div>
    </div>
  );
};

export default WalletProfile;
