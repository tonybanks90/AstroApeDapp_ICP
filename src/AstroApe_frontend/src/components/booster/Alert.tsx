import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type, children, className = '' }) => {
  const styles = {
    success: 'bg-color-4/10 border-color-4/30 text-color-4',
    error: 'bg-color-3/10 border-color-3/30 text-color-3',
    info: 'bg-color-1/10 border-color-1/30 text-color-1'
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  return (
    <div className={`p-4 border rounded-2xl flex items-start space-x-3 ${styles[type]} ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>
      <div className="body-2 flex-1">
        {children}
      </div>
    </div>
  );
};