import React, { useState } from "react";
import Input from "./Input";
import Button from "./Button";
import { Card, CardContent } from "./Card";
import tokenData from "../data/dataToken";
import AddMinusLiq from "./addminusLiq";


const SwapComponent = ({ tokenId }) => {
  const selectedToken = tokenData.find((token) => token.id === Number(tokenId));

  const basepair = selectedToken ? selectedToken.basepair : "BASE";
  const ticker = selectedToken ? selectedToken.ticker.toUpperCase() : "TOKEN";

  const [view, setView] = useState("buy"); // "buy", "sell", "liq"
  const [amount, setAmount] = useState("");
  const [percentage, setPercentage] = useState(0);

  const handleAction = () => {
    const action = view === "buy" ? "Buying" : "Selling";
    const fromToken = view === "buy" ? basepair : ticker;
    const toToken = view === "buy" ? ticker : basepair;
    alert(`${action} ${amount} ${fromToken} for ${toToken}`);
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

  return (
    <Card className="w-full bg-n-8 border border-n-6 shadow-xl rounded-2xl p-6">
      <CardContent className="space-y-6">
        <div className="flex justify-center bg-n-7 p-2 rounded-lg space-x-2">
          <Button
            variant={view === "buy" ? "default" : "ghost"}
            className={`w-1/4 rounded-lg transition-all ${view === "buy" ? "bg-green-600 text-white" : "text-white-400"}`}
            onClick={() => setView("buy")}
          >
            Buy
          </Button>
          <Button
            variant={view === "sell" ? "default" : "ghost"}
            className={`w-1/4 rounded-lg transition-all ${view === "sell" ? "bg-red-600 text-white" : "text-gray-400"}`}
            onClick={() => setView("sell")}
          >
            Sell
          </Button>
          <Button
            variant={view === "liq" ? "default" : "ghost"}
            className={`w-1/4 rounded-lg transition-all ${view === "liq" ? "bg-purple-600 text-white" : "text-gray-400"}`}
            onClick={() => setView("liq")}
          >
            + Liq
          </Button>
          <Button
            variant={view === "liq" ? "default" : "ghost"}
            className={`w-1/4 rounded-lg transition-all ${view === "liq" ? "bg-purple-600 text-white" : "text-gray-400"}`}
            onClick={() => setView("liq")}
          >
            - Liq
          </Button>
        </div>

        {view === "liq" ? (
          <AddMinusLiq tokenId={tokenId}/>
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

            <div className="flex items-center justify-between space-x-2">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  variant="ghost"
                  className={`px-4 py-2 border rounded-md ${
                    percentage === percent ? "bg-purple-600 text-white" : "text-gray-300 hover:bg-gray-700"
                  }`}
                  onClick={() => handlePercentage(percent)}
                >
                  {percent}%
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <button variant="ghost" className="px-4 py-2 border rounded-md hover:text-white" onClick={resetAmount}>
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
