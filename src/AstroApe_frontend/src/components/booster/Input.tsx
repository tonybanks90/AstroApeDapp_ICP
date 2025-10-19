import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  helperText, 
  className = '',
  ...props 
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block caption text-n-3 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`w-full px-5 py-3.5 bg-n-6 border border-n-5 rounded-xl text-n-1 placeholder:text-n-4 focus:border-color-1 focus:outline-none transition-colors ${className}`}
        {...props}
      />
      {helperText && (
        <p className="caption text-n-4">{helperText}</p>
      )}
    </div>
  );
};

interface RangeInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  displayValue?: string;
}

export const RangeInput: React.FC<RangeInputProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="caption text-n-3 uppercase tracking-wider">
          {label}
        </label>
        {displayValue && (
          <span className="font-code text-sm text-n-1">{displayValue}</span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #F7931A 0%, #F7931A ${percentage}%, #3F3A52 ${percentage}%, #3F3A52 100%)`
        }}
      />
      <div className="flex justify-between caption text-n-4">
        <span>{min}%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}