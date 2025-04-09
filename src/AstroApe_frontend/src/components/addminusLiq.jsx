// src/components/AddMinusLiq.jsx
import React from "react";
import tokenData from "../data/dataToken";

const AddMinusLiq = ({ tokenId }) => {
  const token = tokenData.find((t) => t.id === Number(tokenId));
  const bondedProgress = token?.bonded || "0%";

  return (
    <div className="space-y-4 text-center p-6 bg-n-7 rounded-lg">
      <p className="text-gray-300 text-lg font-semibold">Waiting to Bond...</p>

      <div className="flex flex-col gap-2 items-start">
        <div className="w-full bg-n-6 rounded-full h-2 relative">
          <div
            className="h-2 bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: bondedProgress }}
          ></div>
        </div>
        <p className="text-n-1 text-xs">{bondedProgress} Complete</p>
      </div>
    </div>
  );
};

export default AddMinusLiq;
