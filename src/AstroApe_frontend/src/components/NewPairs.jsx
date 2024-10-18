import React from "react";
import Input from "./Input"; // Assuming you have an Input component
import Button from "./Button"; // Assuming you have a Button component
import PairCard from "./PairCard"; // Import the new PairCard component

const NewPairs = () => {
  return (
    <div className="mt-15 p-6 lg:p-8">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-n-1">New Pairs</h1>
        <p className="text-lg text-n-2 mt-2">
          Discover and add new pairs to your collection. Explore the latest tokens and their details.
        </p>
      </header>

      {/* Search and Filter Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <Input
          id="search"
          name="search"
          type="text"
          placeholder="Search for pairs..."
          className="w-full lg:w-1/2"
        />
        <Button className="mt-4 lg:mt-0 lg:ml-4">Filter</Button>
      </div>

      {/* Pairs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Example Pair Cards */}
        {Array.from({ length: 8 }).map((_, index) => (
          <PairCard
            key={index}
            title={`Pair ${index + 1}`}
            details="Details about the pair, including its performance and statistics."
          />
        ))}
      </div>
    </div>
  );
};

export default NewPairs;
