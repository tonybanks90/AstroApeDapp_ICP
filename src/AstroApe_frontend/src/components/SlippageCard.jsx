import React, { useState } from "react";
import { FaCog } from "react-icons/fa";
import Input from "./Input";

const SlippageCard = ({ slippage, onChange }) => {
  const [open, setOpen] = useState(false);
  const presets = [
    { label: "Off", value: 0 },
    { label: "1%", value: 1 },
    { label: "2%", value: 2 },
    { label: "3%", value: 3 },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm text-gray-300 hover:text-white"
      >
        <FaCog className="text-xl" />
        <span>{slippage}%</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-n-8 border border-n-6 rounded-2xl p-6 w-80 shadow-2xl relative">
            <button
              className="absolute top-2 right-3 text-gray-400 hover:text-white text-lg"
              onClick={() => setOpen(false)}
            >
              &times;
            </button>
            <p className="text-white font-semibold text-lg mb-4 text-center">
              Slippage Tolerance
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {presets.map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => {
                    onChange(value);
                    setOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    slippage === value
                      ? "bg-color-1 text-white"
                      : "bg-n-6 text-gray-300 hover:bg-n-5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 text-sm font-medium">
                Custom
              </label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={slippage}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full p-2 border border-gray-600 rounded-lg bg-n-7 text-white placeholder:text-gray-500"
                placeholder="Enter custom %"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SlippageCard;
