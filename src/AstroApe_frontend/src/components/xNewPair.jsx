import React from "react";
import Input from "./Input";
import Button from "./Button";
import PairCard from "./xPairCard";
import LoginButton from "./login-button";
import tokenData from "../data/tokendata"; 

const xNewPairs = () => {
  return (
    <div className="mt-15 p-6 lg:p-8">
      
      {/* Page Header */}
      <header className="mb-8">
        <LoginButton />
        <h1 className="text-3xl font-bold text-n-1">New Pairs</h1>
        <p className="text-lg text-n-2 mt-2">
          Discover and add new pairs to your collection. Explore the latest tokens and their details.
        </p>
      </header>

      {/* Search and Filter Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <Input id="search" name="search" type="text" placeholder="Search for pairs..." className="w-full lg:w-1/2" />
        <Button className="mt-4 lg:mt-0 lg:ml-4">Filter</Button>
      </div>

      {/* Pairs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokenData.map((token) => (
          <PairCard
            key={token.id}
            logo={token.logo}
            name={token.name}
            ticker={token.ticker}
            priceUSD={token.priceUSD}
            marketCap={token.marketCap}
            volume={token.volume}
            holders={token.holders}
            websitelink={token.websitelink}
            twitterlink={token.twitterlink}
            telegramlink={token.telegramlink}
            icons={token.icons}
          />
        ))}
      </div>
    </div>
  );
};

export default xNewPairs;