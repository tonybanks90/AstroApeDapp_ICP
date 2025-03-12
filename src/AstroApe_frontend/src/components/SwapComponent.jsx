import React, { useState } from "react";
import  Input  from "./Input";
import  Button  from "./Button";
import { Card, CardContent } from "./Card";

const SwapComponent = () => {
  const [isBuying, setIsBuying] = useState(true);
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState(0);

  const selectBuy = () => setIsBuying(true);
  const selectSell = () => setIsBuying(false);

  const handleAction = () => {
    const action = isBuying ? "Buying" : "Selling";
    const fromToken = isBuying ? "ckETH" : "APE";
    const toToken = isBuying ? "APE" : "ckETH";
    alert(`${action} ${amount} ${fromToken} for ${toToken}`);
  };

  const handlePercentage = (value) => {
    setPercentage(value);
    const balance = isBuying ? 1000 : 500;
    setAmount((balance * value) / 100);
  };

  const resetAmount = () => {
    setAmount("");
    setPercentage(0);
  };

  return (
    <Card className="w-full bg-n-8 border border-n-6 shadow-xl rounded-2xl p-6">
      <CardContent className="space-y-6">
        {/* Buy/Sell Toggle */}
        <div className="flex justify-center bg-n-7 p-1 rounded-lg">
          <Button
            variant={isBuying ? "default" : "ghost"}
            className={`w-1/2 rounded-lg transition-all ${
              isBuying ? "bg-purple-600 text-white" : "text-gray-400"
            }`}
            onClick={selectBuy}
          >
            Buy
          </Button>
          <Button
            variant={!isBuying ? "default" : "ghost"}
            className={`w-1/2 rounded-lg transition-all ${
              !isBuying ? "bg-purple-600 text-white" : "text-gray-400"
            }`}
            onClick={selectSell}
          >
            Sell
          </Button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-gray-300 text-lg font-semibold mb-2">
            {isBuying ? "Buy APE" : "Sell APE"}
          </label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-500"
            placeholder={`Enter amount of ${isBuying ? "ckETH" : "APE"}`}
            min="0"
          />
        </div>

        {/* Percentage Selection */}
        <div className="flex items-center justify-between space-x-2">
          {[25, 50, 75, 100].map((percent) => (
            <Button
              key={percent}
              variant="ghost"
              className={`w-full py-2 text-sm rounded-lg transition-all ${
                percentage === percent ? "bg-purple-600 text-white" : "text-gray-300 hover:bg-gray-700"
              }`}
              onClick={() => handlePercentage(percent)}
            >
              {percent}%
            </Button>
          ))}
        </div>

        {/* Reset & Swap Buttons */}
        <div className="flex justify-between">
          <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={resetAmount}>
            Reset
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg" onClick={handleAction}>
            Place Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SwapComponent;
