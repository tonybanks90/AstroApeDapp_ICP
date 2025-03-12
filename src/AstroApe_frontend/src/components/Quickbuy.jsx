import React, { useState } from "react";
import { Settings } from "lucide-react";

const QuickBuy = () => {
  const [percentage, setPercentage] = useState(25);
  const fee = 3;

  return (
    <div className="flex items-center bg-n-8 px-4 py-2 rounded-lg w-full max-w-sm">
      <button className="flex items-center text-color-1 font-semibold">
        <span className="mr-2">⚡</span> QUICK SELL
      </button>
      <div className="flex-grow mx-4">
        <input
          type="number"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          className="bg-n-6 text-center text-white rounded-lg w-full px-2 py-1 outline-none"
        />
      </div>
      <div className="flex items-center text-white">
        <Settings size={16} className="mr-1" /> {fee}%
      </div>
    </div>
  );
};

export default QuickBuy;