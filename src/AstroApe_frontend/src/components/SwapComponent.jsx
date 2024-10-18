import React, { useState } from "react";
import Input from "./Input";
import Button from "./Button";

const SwapComponent = () => {
  const [isBuying, setIsBuying] = useState(true); // State to toggle between Buy and Sell
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState(0); // State to manage selected percentage

  // Toggles between Buy and Sell modes
  const selectBuy = () => setIsBuying(true);
  const selectSell = () => setIsBuying(false);

  // Handles the swap action
  const handleAction = () => {
    const action = isBuying ? "Buying" : "Selling";
    const fromToken = isBuying ? "ckETH" : "APE"; // Default tokens, can be extended
    const toToken = isBuying ? "APE" : "ckETH";
    alert(`${action} ${amount} ${fromToken} for ${toToken}`);
  };

  // Function to handle percentage selection
  const handlePercentage = (value) => {
    setPercentage(value);
    // Example logic for setting amount based on balance (assuming 1000 as the current balance for demonstration)
    const balance = isBuying ? 1000 : 500; // Mock balance values; replace with real data
    setAmount((balance * value) / 100);
  };

  // Resets the amount and percentage
  const resetAmount = () => {
    setAmount("");
    setPercentage(0);
  };

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-6 h-full">
      {/* Buy and Sell Toggle Buttons */}
      <div className="flex justify-center mb-6">
        <button
          onClick={selectBuy}
          className={`px-4 py-2 rounded-l-lg text-lg font-medium ${
            isBuying ? "bg-blue-500 text-white" : "bg-n-7 text-n-1"
          }`}
        >
          Buy
        </button>
        <button
          onClick={selectSell}
          className={`px-4 py-2 rounded-r-lg text-lg font-medium ${
            !isBuying ? "bg-blue-500 text-white" : "bg-n-7 text-n-1"
          }`}
        >
          Sell
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="amount">
          {isBuying ? "Buy APE" : "Sell APE"}
        </label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 border border-n-6 rounded bg-n-9 text-n-1"
          placeholder={`Enter amount of ${isBuying ? "ckETH" : "APE"}`}
          min="0"
        />
      </div>

      {/* Percentage Buttons - Responsive Design */}
      <div className="flex flex-wrap justify-center gap-2 lg:flex-nowrap lg:space-x-2 mb-4">
        {/* Reset Button */}
        <button
          onClick={resetAmount}
          className="px-2 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>

        {/* Percentage Buttons */}
        {[25, 50, 75, 100].map((percent) => (
          <button
            key={percent}
            onClick={() => handlePercentage(percent)}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              percentage === percent ? "bg-blue-500 text-white" : "bg-gray-600 text-white hover:bg-gray-700"
            }`}
          >
            {percent}%
          </button>
        ))}
      </div>

      {/* Place Order Button */}
      <Button onClick={handleAction} className="bg-blue-500 text-white py-2 px-4 rounded w-full">
        Place Order
      </Button>
    </div>
  );
};

export default SwapComponent;
