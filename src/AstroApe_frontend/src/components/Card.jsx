import React from "react";

export const Card = ({ children, className = "" }) => (
  <div className={`bg-gray-800 p-4 rounded-xl shadow-md ${className}`}>
    {children}
  </div>
);

export const CardContent = ({ children, className = "" }) => (
  <div className={`p-4 ${className}`}>{children}</div>
);
