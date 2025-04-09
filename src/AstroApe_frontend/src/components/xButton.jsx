import { useState } from "react";

const xButton = ({ options, selected, onSelect, className = "" }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="relative inline-flex">
      {/* Main Button */}
      <button
        type="button"
        className={`button relative inline-flex items-center justify-center h-11 px-7 transition-colors hover:text-color-1 text-n-1 bg-n-8 rounded-md ${className}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="relative z-10">
          {options.find((option) => option.key === selected)?.name || "Select Chain"}
        </span>
      </button>

      {/* Expandable Options */}
      {expanded && (
        <div className="absolute left-0 top-full mt-2 w-full bg-n-8 rounded-md shadow-lg z-20 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`block w-full text-left px-7 py-2 transition-colors hover:text-white hover:bg-purple-600 ${
                selected === option.key ? "bg-purple-700 text-white" : "text-n-1"
              }`}
              onClick={() => {
                onSelect(option.key);
                setExpanded(false);
              }}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default xButton;
