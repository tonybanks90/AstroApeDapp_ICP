import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  children, 
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "button relative inline-flex items-center justify-center h-11 px-7 rounded-xl transition-all font-code text-xs uppercase tracking-wider";
  
  const variants = {
    primary: "text-n-8 bg-color-1 hover:bg-color-2 disabled:bg-n-5 disabled:text-n-4",
    secondary: "text-n-1 bg-n-6 border border-n-5 hover:bg-n-5 disabled:opacity-50",
    ghost: "text-color-1 hover:text-color-2 hover:bg-n-7"
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};