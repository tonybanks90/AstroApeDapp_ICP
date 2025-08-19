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

  const [mode, setMode] = useState("trades");
  const [view, setView] = useState("buy");
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState(0);
  const [slippage, setSlippage] = useState(0.5);

  const handleAction = () => {
    const action = view === "buy" ? "Buying" : "Selling";
    const fromToken = view === "buy" ? basepair : ticker;
    const toToken = view === "buy" ? ticker : basepair;
    alert(`${action} ${amount} ${fromToken} for ${toToken} with ${slippage}% slippage`);
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
    <Card className="relative w-full max-w-md bg-n-8 border border-n-6 shadow-xl rounded-xl p-4 space-y-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-1">
          <button
            onClick={() => {
              setMode("trades");
              setView("buy");
            }}
            className={`px-3 py-1 text-sm font-medium rounded-md transition w-full ${
              mode === "trades"
                ? "bg-color-1 text-white"
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
            className={`px-3 py-1 text-sm font-medium rounded-md transition w-full ${
              mode === "liquidity"
                ? "bg-color-1 text-white"
                : "bg-n-6 text-gray-400 hover:bg-n-5"
            }`}
          >
            Liquidity
          </button>
        </div>

        {/* Close (mobile only) */}
        <button
          className="lg:hidden text-white text-lg font-bold"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <CardContent className="space-y-2">
        {/* Buy/Sell Toggle */}
        {mode === "trades" && (
          <div className="flex rounded-md overflow-hidden border border-n-6 w-full">
            {["buy", "sell"].map((type) => (
              <Button
                key={type}
                variant={view === type ? "default" : "ghost"}
                className={`flex-1 py-2 transition ${
                  view === type
                    ? "bg-color-5 text-white"
                    : "bg-n-7 text-white/50 hover:text-white"
                }`}
                onClick={() => setView(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        )}

        {/* Main Content */}
        {view === "liq" ? (
          <AddMinusLiq tokenId={tokenId} />
        ) : (
          <>
            {/* Input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1">
                {view === "buy" ? `Buy ${ticker}` : `Sell ${ticker}`}
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-n-6 rounded-md bg-n-7 text-white placeholder-gray-500"
                placeholder={`Enter amount of ${view === "buy" ? basepair : ticker}`}
                min="0"
              />
            </div>

            {/* Amount Buttons */}
            <div className="grid grid-cols-4 gap-1 w-full">
              {view === "sell"
                ? [25, 50, 75, 100].map((percent) => (
                    <button
                      key={percent}
                      className={`py-2 rounded-md text-xs transition border w-full ${
                        percentage === percent
                          ? "bg-color-1 text-white border-color-1"
                          : "text-gray-300 border-n-6 hover:bg-n-6"
                      }`}
                      onClick={() => {
                        setPercentage(percent);
                        const balance = 500;
                        setAmount((balance * percent) / 100);
                      }}
                    >
                      {percent}%
                    </button>
                  ))
                : [0.01, 0.05, 0.015, 0.03].map((value) => (
                    <button
                      key={value}
                      className={`py-2 rounded-md text-xs transition border w-full ${
                        parseFloat(amount) === value
                          ? "bg-color-1 text-white border-color-1"
                          : "text-gray-300 border-n-6 hover:bg-n-6"
                      }`}
                      onClick={() => {
                        setAmount(value);
                        setPercentage(0);
                      }}
                    >
                      {value}
                    </button>
                  ))}
            </div>

            {/* Slippage + Output */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 bg-n-7 rounded-md border border-n-6 w-full">
              <p className="text-xs text-gray-400">
                receive approx:{" "}
                <span className="text-white font-medium">
                  {getEstimatedOutput()} {view === "buy" ? ticker : basepair}
                </span>
              </p>
              <SlippageCard slippage={slippage} onChange={setSlippage} />
            </div>

            {/* Reset & Order */}
            <div className="flex gap-2 w-full">
              <button
                className="flex-1 py-2 border rounded-md text-gray-400 hover:text-white hover:bg-n-6 transition text-sm"
                onClick={resetAmount}
              >
                Reset
              </button>
              <Button
                className="flex-1 py-2 bg-color-5 text-white rounded-md hover:opacity-90 transition text-sm"
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
