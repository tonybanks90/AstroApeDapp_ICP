import React, { useState } from "react";
import Input from "./Input"; // Assuming the Input component is already created
import Button from "./Button"; // Assuming the Button component is already created

const SwapComponent = () => {
  const [tokenFrom, setTokenFrom] = useState("APE");
  const [tokenTo, setTokenTo] = useState("ckETH");
  const [amount, setAmount] = useState("");

  const handleSwap = () => {
    alert(`Swapping ${amount} ${tokenFrom} to ${tokenTo}`);
  };

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-6 h-full">
      <h2 className="text-2xl font-bold text-n-1 mb-6">Swap Tokens</h2>

      <div className="mb-4">
        <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="tokenFrom">
          From
        </label>
        <select
          id="tokenFrom"
          className="w-full p-2 border border-n-6 rounded bg-n-9 text-n-1"
          value={tokenFrom}
          onChange={(e) => setTokenFrom(e.target.value)}
        >
          <option value="APE">APE</option>
          <option value="ckETH">ckETH</option>
          <option value="ICP">ICP</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="tokenTo">
          To
        </label>
        <select
          id="tokenTo"
          className="w-full p-2 border border-n-6 rounded bg-n-9 text-n-1"
          value={tokenTo}
          onChange={(e) => setTokenTo(e.target.value)}
        >
          <option value="APE">APE</option>
          <option value="ckETH">ckETH</option>
          <option value="ICP">ICP</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="amount">
          Amount
        </label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border border-n-6 rounded bg-n-9 text-n-1"
        />
      </div>

      <Button
        onClick={handleSwap}
        className="bg-blue-500 text-white py-2 px-4 rounded w-full"
      >
        Swap
      </Button>
    </div>
  );
};

export default SwapComponent;
