import React, { useState } from "react";
import Input from "./Input";
import Button from "./Button";
import PairCard from "./PairCard";
import { FiTrendingUp, FiFlag } from "react-icons/fi";
import { FaRocket, FaCrown } from "react-icons/fa";
import tokenData from "../data/dataToken";
import { Link } from "react-router-dom";
import MenuSvg from "../assets/svg/MenuSvg";
import Guide from "./Guide"; // ✅ Import Guide

const chains = ["ETH", "BASE", "SOL", "SUI"];

const NewPairs = () => {
  const [selectedChain, setSelectedChain] = useState("ETH");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isBondedExpanded, setIsBondedExpanded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="lg:mt-9 mb-12 p-6">

      {/* --- Top Row Buttons --- */}
      <div className="flex justify-center lg:justify-end gap-3 mb-4">
        {/* How it works */}
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="px-4 py-2 border rounded-md bg-n-8 text-n-1 hover:bg-color-1 hover:text-white transition font-bold text-sm"
        >
          How it works
        </button>

        {/* Launch Token */}
        <Link to="/Token/2">
          <button
            type="button"
            className="px-4 py-2 border rounded-md bg-n-8 text-n-1 hover:bg-color-1 hover:text-white transition font-bold text-sm"
          >
            Launch Token
          </button>
        </Link>
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
                    className={`px-4 py-2 border rounded-md w-full text-left ${
                      selectedChain === chain
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
          <Button className="text-white flex items-center gap-2">
            <FiTrendingUp /> Trending
          </Button>
          <Button className="text-white flex items-center gap-2">
            <FaCrown /> Top MC
          </Button>
          <Button className="text-white flex items-center gap-2">
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

        {/* Right Section - Search & Toggle */}
        <div className="flex items-center gap-3">
          <Input
            id="search"
            name="search"
            type="text"
            placeholder="Search for pairs..."
            className="w-full lg:w-72"
          />
          <MenuSvg />
        </div>
      </div>

      {/* --- Pairs Grid --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokenData.map((token) => (
          <Link key={token.id} to={`/Token/swap/${token.id}`}>
            <PairCard
              id={token.id}
              logo={token.logo}
              name={token.name}
              xmarketCap={token.xmarketCap}
              numReplies={token.numReplies}
              ticker={token.ticker}
            />
          </Link>
        ))}
      </div>

      {/* --- Guide Modal --- */}
      {showGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-n-8 p-6 rounded-xl max-w-lg w-full relative">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-3 right-3 text-white hover:text-color-1"
            >
              ✕
            </button>
            <Guide />
          </div>
        </div>
      )}
    </div>
  );
};

export default NewPairs;
