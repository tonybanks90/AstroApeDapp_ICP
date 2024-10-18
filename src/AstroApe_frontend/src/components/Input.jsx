import React from "react";

const Input = ({ id, name, type = "text", value, onChange, placeholder, required = false, className = "" }) => {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={type !== "file" ? value : undefined} // Don't pass value for file input
      onChange={onChange}
      placeholder={type !== "file" ? placeholder : undefined} // Placeholder not needed for file input
      required={required}
      className={`w-full px-4 py-2 border border-n-6 rounded-md text-n-1 bg-n-8 focus:outline-none focus:ring-2 focus:ring-color-1 transition duration-150 ease-in-out ${className}`}
    />
  );
};

export default Input;
