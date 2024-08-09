import React, { useState } from "react";
import Input from "./Input";
import Button from "./Button";

const WrapCoin = () => {
  const [amount, setAmount] = useState("");
  const [coin, setCoin] = useState("ETH");

  const handleWrap = () => {
    alert(`Wrapping ${amount} ${coin}`);
  };

  return (
    <div className="bg-n-8 border border-n-6 rounded-lg p-4 w-full max-w-sm mx-auto mt-10">
      <h2 className="text-2xl font-bold text-n-1 mb-6">Wrap Coin</h2>
      <div className="mb-2">
        <label className="block text-n-1 text-lg font-medium mb-2" htmlFor="amount">
          Amount
        </label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
        />
      </div>
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
      <Button onClick={handleWrap} className="w-full">
        Wrap
      </Button>
    </div>
  );
};

export default WrapCoin;
