import React, { useState } from "react";

const DepositWithdraw = ({ username, balances, onClose }) => {
  const [tab, setTab] = useState("deposit");
  const [selectedToken, setSelectedToken] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [amount, setAmount] = useState("");

  const tokens = ["BTC", "ETH", "SOL", "xTOKEN"];
  const options = ["Connected Wallet", "External Deposit", "Buy Bitcoin", "Buy Ethereum", "Buy Solana"];
  const presetAmounts = [0.015, 0.03, 0.045, 0.09];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-n-8 p-6 rounded-lg w-96 border border-n-6">
        <h2 className="text-xl font-semibold text-n-1 mb-4 text-center">{username}</h2>

        <div className="flex justify-between border-b border-n-6 mb-4">
          <button className={`w-1/2 py-2 ${tab === "deposit" ? "bg-n-6 text-n-1" : "text-n-3"}`} onClick={() => setTab("deposit")}>
            Deposit
          </button>
          <button className={`w-1/2 py-2 ${tab === "withdraw" ? "bg-n-6 text-n-1" : "text-n-3"}`} onClick={() => setTab("withdraw")}>
            Withdraw
          </button>
        </div>

        <div className="mb-4">
          <label className="text-n-2 block mb-1">Token</label>
          <select className="w-full bg-n-7 p-2 rounded border border-n-6 text-n-1" value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)}>
            <option value="">Select a token</option>
            {tokens.map((token) => (
              <option key={token} value={token}>{token}</option>
            ))}
          </select>
        </div>

        {selectedToken && balances[selectedToken] !== undefined && (
          <div className="mb-4">
            <label className="text-n-2 block mb-1">Balance</label>
            <div className="w-full p-2 bg-n-7 rounded border border-n-6 text-n-1">
              {balances[selectedToken] || "0.00"} {selectedToken}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="text-n-2 block mb-1">Deposit Method</label>
          <select className="w-full bg-n-7 p-2 rounded border border-n-6 text-n-1" value={selectedOption} onChange={(e) => setSelectedOption(e.target.value)}>
            <option value="">Select an option</option>
            {options.map((option) => (
              <option key={option} value={option}>{option.replace("Buy", `Buy ${selectedToken || ""}`)}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="text-n-2 block mb-1">Amount</label>
          <input type="text" className="w-full p-2 bg-n-7 rounded border border-n-6 text-n-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" />
        </div>

        <div className="flex justify-between mb-4">
          {presetAmounts.map((val) => (
            <button key={val} onClick={() => setAmount(val.toString())} className="p-2 bg-n-6 text-n-1 rounded text-sm">
              {val}
            </button>
          ))}
        </div>

        {selectedToken && (
          <p className="text-xs text-n-3 mb-4">Fee: 0.00002010 {selectedToken} | Min: 0.0001 {selectedToken}</p>
        )}

        <button className="w-full py-2 mt-4 bg-purple-500 text-white rounded-lg shadow-lg animate-pulse">
          Confirm {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      </div>
    </div>
  );
};

export default DepositWithdraw;
// Compare this snippet from src/AstroApe_frontend/src/components/TokenDeploy.jsx:
