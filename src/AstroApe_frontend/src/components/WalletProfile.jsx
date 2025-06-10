import React from "react";
import { Link, useLocation } from "react-router-dom";
import Tokens from "./Tokens";
import Liquidity from "./Liquidity";
import Created from "./Created";
import Activity from "./Activity";

const WalletProfile = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tab = params.get("tab") || "tokens";

  const tabItems = [
    { label: "Tokens", value: "tokens" },
    { label: "Liquidity", value: "liquidity" },
    { label: "Created", value: "created" },
    { label: "Activity", value: "activity" },
  ];

  return (
    <div className="mt-4 px-4 sm:px-6 lg:px-8">
      <div className="bg-n-8 border border-n-6 rounded-2xl p-4 sm:p-6 shadow-xl">
        <h2 className="text-xl sm:text-2xl font-bold text-n-1 mb-4">Wallet Profile</h2>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {tabItems.map((item) => (
            <Link
              key={item.value}
              to={`/Token/profile?tab=${item.value}`}
              className={`text-center px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl border transition-all duration-200 ${
                tab === item.value
                  ? "bg-color-1 text-white border-color-1"
                  : "bg-n-6 text-n-1 border-n-6 hover:bg-n-5"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-n-8 border border-n-6 rounded-2xl p-4 sm:p-6 shadow-lg">
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
