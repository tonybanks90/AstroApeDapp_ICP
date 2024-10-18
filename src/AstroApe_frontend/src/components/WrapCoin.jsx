import React, { useState } from "react";
import Input from "./Input";
import Button from "./Button";

const WrapCoin = () => {
  const [amount, setAmount] = useState("");
  const [coin, setCoin] = useState("ETH");
  const [isWrapping, setIsWrapping] = useState(true); // State to determine if wrapping or unwrapping

  // Handle the wrap or unwrap action
  const handleAction = () => {
    if (amount <= 0) {
      alert("Please enter an amount greater than 0.");
      return;
    }
    const action = isWrapping ? "Wrapping" : "Unwrapping";
    const fromCoin = isWrapping ? coin : `ck${coin}`;
    const toCoin = isWrapping ? `ck${coin}` : coin;
    alert(`${action} ${amount} from ${fromCoin} to ${toCoin}`);
  };

  // Toggle between wrapping and unwrapping
  const selectWrap = () => setIsWrapping(true);
  const selectUnwrap = () => setIsWrapping(false);

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-4 w-full max-w-sm mx-auto mt-10">
      {/* Toggle Buttons for Wrap and Unwrap */}
      <div className="flex justify-center mb-6">
        <button
          onClick={selectWrap}
          className={`px-4 py-2 rounded-l-lg text-lg font-medium ${
            isWrapping ? "bg-blue-500 text-white" : "bg-n-7 text-n-1"
          }`}
        >
          Wrap
        </button>
        <button
          onClick={selectUnwrap}
          className={`px-4 py-2 rounded-r-lg text-lg font-medium ${
            !isWrapping ? "bg-blue-500 text-white" : "bg-n-7 text-n-1"
          }`}
        >
          Unwrap
        </button>
      </div>
      {/* Coin Selection */}
      <div className="mb-6">
        <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="coin">
          Select Coin
        </label>
        <select
          id="coin"
          className="w-full p-2 border border-n-6 rounded bg-n-9 text-n-1"
          value={coin}
          onChange={(e) => setCoin(e.target.value)}
        >
          <option value="ETH">ETH</option>
        </select>
      </div>
      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="amount">
          Amount
        </label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          min="0.01"
        />
      </div>
      {/* Action Button */}
      <Button onClick={handleAction} className="w-full">
        {isWrapping ? `Wrap to ck${coin}` : `Unwrap to ${coin}`}
      </Button>
    </div>
  );
};

export default WrapCoin;
