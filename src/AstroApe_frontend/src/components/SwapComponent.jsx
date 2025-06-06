import React, { useState } from "react";
import Input from "./Input";
import Button from "./Button";
import { Card, CardContent } from "./Card";
import tokenData from "../data/dataToken";
import AddMinusLiq from "./addminusLiq";
import SlippageCard from "./SlippageCard";

const SwapComponent = ({ tokenId, onClose }) => {
  const selectedToken = tokenData.find((token) => token.id === Number(tokenId));
  const basepair = selectedToken ? selectedToken.basepair : "BASE";
  const ticker = selectedToken ? selectedToken.ticker.toUpperCase() : "TOKEN";

  const [mode, setMode] = useState("trades"); // 'trades' or 'liquidity'
  const [view, setView] = useState("buy"); // 'buy', 'sell', or 'liq'
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState(0);
  const [slippage, setSlippage] = useState(0.5);

  const handleAction = () => {
    const action = view === "buy" ? "Buying" : "Selling";
    const fromToken = view === "buy" ? basepair : ticker;
    const toToken = view === "buy" ? ticker : basepair;
    alert(`${action} ${amount} ${fromToken} for ${toToken} with ${slippage}% slippage`);
  };

  const handlePercentage = (value) => {
    setPercentage(value);
    const balance = view === "buy" ? 1000 : 500;
    setAmount((balance * value) / 100);
  };

  const resetAmount = () => {
    setAmount("");
    setPercentage(0);
  };

  const getEstimatedOutput = () => {
    const rate = 1;
    const output = parseFloat(amount || 0) * rate;
    const minReceived = output * (1 - slippage / 100);
    return minReceived.toFixed(4);
  };

  return (
    <Card className="relative w-full bg-n-8 border border-n-6 shadow-xl rounded-2xl p-6">
      {/* Top Left Mode Toggle */}
      <div className="absolute top-4 left-4 z-10">
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setMode("trades");
              setView("buy");
            }}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              mode === "trades"
                ? "bg-purple-600 text-white"
                : "bg-n-6 text-gray-400 hover:bg-n-5"
            }`}
          >
            Trades
          </button>
          <button
            onClick={() => {
              setMode("liquidity");
              setView("liq");
            }}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              mode === "liquidity"
                ? "bg-purple-600 text-white"
                : "bg-n-6 text-gray-400 hover:bg-n-5"
            }`}
          >
            Liquidity
          </button>
        </div>
      </div>

      {/* Close button for small screens */}
      <button
        className="lg:hidden absolute top-3 right-4 text-white text-3xl font-bold z-50"
        onClick={onClose}
      >
        ✕
      </button>

      <CardContent className="space-y-6 mt-10">
        {/* Buy/Sell Toggle inside Trades */}
        {mode === "trades" && (
          <div className="flex justify-center bg-n-7 p-2 rounded-lg space-x-2">
            {["buy", "sell"].map((type) => (
              <Button
                key={type}
                variant={view === type ? "default" : "ghost"}
                className={`w-1/2 rounded-lg ${
                  view === type
                    ? type === "buy"
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
                    : "text-white/40"
                }`}
                onClick={() => setView(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        )}

        {/* Main content */}
        {view === "liq" ? (
          <AddMinusLiq tokenId={tokenId} />
        ) : (
          <>
            <div>
              <label className="block text-gray-300 text-lg font-semibold mb-2">
                {view === "buy" ? `Buy ${ticker}` : `Sell ${ticker}`}
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-500"
                placeholder={`Enter amount of ${view === "buy" ? basepair : ticker}`}
                min="0"
              />
            </div>

            {/* Amount Buttons */}
<div className="flex items-center justify-between space-x-2">
  {view === "sell"
    ? [25, 50, 75, 100].map((percent) => (
        <button
          key={percent}
          className={`px-4 py-2 border rounded-md text-sm ${
            percentage === percent ? "bg-purple-600 text-white" : "text-gray-300 hover:bg-gray-700"
          }`}
          onClick={() => {
            setPercentage(percent);
            const balance = 500; // replace with actual token balance if available
            setAmount((balance * percent) / 100);
          }}
        >
          {percent}%
        </button>
      ))
    : [0.01, 0.05, 0.015, 0.03].map((value) => (
        <button
          key={value}
          className={`px-4 py-2 border rounded-md text-sm ${
            parseFloat(amount) === value ? "bg-purple-600 text-white" : "text-gray-300 hover:bg-gray-700"
          }`}
          onClick={() => {
            setAmount(value);
            setPercentage(0); // reset percentage when using fixed buy amounts
          }}
        >
          {value}
        </button>
      ))}
</div>


            {/* Slippage & Output */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-4">
              <p className="text-sm text-gray-400">
                You will receive approx:{" "}
                <span className="text-white font-medium">
                  {getEstimatedOutput()} {view === "buy" ? ticker : basepair}
                </span>
              </p>
              <div className="w-full sm:w-auto">
                <SlippageCard slippage={slippage} onChange={setSlippage} />
              </div>
            </div>

            {/* Reset & Place Order */}
            <div className="flex justify-between mt-4">
              <button
                className="px-4 py-2 border rounded-md text-gray-400 hover:text-white"
                onClick={resetAmount}
              >
                Reset
              </button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
                onClick={handleAction}
              >
                Place Order
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SwapComponent;
