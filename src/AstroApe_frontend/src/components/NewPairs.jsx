import React, { useState } from "react";
import Input from "./Input";
import Button from "./newbutton";
import PairCard from "./PairCard";
import { FiTrendingUp, FiFlag } from "react-icons/fi";
import { FaRocket, FaCrown } from "react-icons/fa";
import tokenData from "../data/dataToken";
import { Link } from "react-router-dom";

const chains = ["ETH", "BASE", "SOL", "SUI"];

const NewPairs = () => {
  const [selectedChain, setSelectedChain] = useState("ETH");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBondedExpanded, setIsBondedExpanded] = useState(false);

  return (
    <div className="mt-15 p-6">
      {/* Search and Button Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
        <div className="flex flex-wrap gap-3">
          {/* Select Chain Button */}
          <div className="relative z-50">
            <button
              className="px-4 py-2 bg-purple-700 text-white rounded-md"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              {selectedChain} ▼
            </button>
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 bg-gray-900 text-white shadow-lg rounded-md w-full border border-gray-700">
                {chains.map((chain) => (
                  <button
                    key={chain}
                    className="w-full px-4 py-2 text-left hover:bg-gray-800"
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
          <Button className="bg-purple-700 text-white flex items-center gap-2">
            <FiTrendingUp /> Trending
          </Button>
          <Button className="bg-purple-700 text-white flex items-center gap-2">
            <FaCrown /> Top MC
          </Button>
          <Button className="bg-purple-700 text-white flex items-center gap-2">
            <FaRocket /> New
          </Button>

          {/* Bonded Button */}
          <div className="relative z-50">
            <button
              className="bg-purple-700 text-white flex items-center gap-2 px-4 py-2 rounded-md"
              onClick={() => setIsBondedExpanded(!isBondedExpanded)}
            >
              <FiFlag /> Bonded
            </button>
            {isBondedExpanded && (
              <div className="absolute left-0 mt-2 w-48 bg-[#1e1e1e] text-white rounded-xl border border-gray-700 shadow-2xl">
                {["Top MC", "New", "Old"].map((item, idx) => (
                  <button
                    key={idx}
                    className="w-full px-4 py-2 text-left hover:bg-[#2a2a2a] transition-colors duration-200"
                    onClick={() => {
                      console.log(`Selected: ${item}`);
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

        {/* Search Input */}
        <Input
          id="search"
          name="search"
          type="text"
          placeholder="Search for pairs..."
          className="w-full lg:w-1/3"
        />
      </div>

      {/* Pairs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokenData.map((token) => (
          <Link key={token.id} to={`/Token/swap/${token.id}`}>
            <PairCard
              id={token.id} // ✅ Add this line
              logo={token.logo}
              name={token.name}
              xmarketCap={token.xmarketCap}
              numReplies={token.numReplies}
              ticker={token.ticker}
            />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NewPairs;
