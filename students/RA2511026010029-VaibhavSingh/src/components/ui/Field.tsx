import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  id: string;
}

export function Field({ label, helperText, error, id, className = '', ...props }: FieldProps) {
  return (
    <div className="w-full flex flex-col gap-1.5 mb-4">
      <label htmlFor={id} className="text-base font-bold text-text">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        aria-invalid={!!error}
        className={`w-full min-h-[52px] px-4 rounded-xl bg-grey-900 border text-text placeholder-grey-500 focus:outline-none focus:ring-4 focus:ring-lime focus:border-lime text-lg ${
          error ? 'border-danger' : 'border-grey-700'
        } ${className}`}
        {...props}
      />
      {helperText && !error && (
        <p id={`${id}-helper`} className="text-sm text-grey-300">
          {helperText}
        </p>
      )}
      {error && (
        <div id={`${id}-error`} className="flex items-center gap-1.5 text-danger text-sm font-semibold mt-0.5">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
