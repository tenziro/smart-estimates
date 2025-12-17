import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AlertProps {
  variant?: 'default' | 'destructive' | 'success';
  title: string;
  description?: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ 
  variant = 'default', 
  title, 
  description, 
  onClose,
  className 
}) => {
  const styles = {
    default: "bg-slate-100 border-slate-200 text-slate-800",
    destructive: "bg-red-50 border-red-200 text-red-800",
    success: "bg-green-50 border-green-200 text-green-800",
  };

  const icons = {
    default: <AlertCircle className="h-4 w-4" />,
    destructive: <AlertCircle className="h-4 w-4" />,
    success: <CheckCircle2 className="h-4 w-4" />,
  };

  return (
    <div className={cn(
      "relative w-full rounded-lg border p-4 flex gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300",
      styles[variant],
      className
    )}>
      <div className="mt-0.5 shrink-0">
        {icons[variant]}
      </div>
      <div className="flex-1">
        <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 opacity-50 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};