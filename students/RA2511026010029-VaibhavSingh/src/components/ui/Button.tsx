import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'huge';
  size?: 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'lg', isLoading, className = '', disabled, ...props }, ref) => {
    let baseStyles =
      'inline-flex items-center justify-center font-bold transition-all duration-200 rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-lime focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

    // Min height 56px on worker screens
    let sizeStyles = 'min-h-[56px] px-6 text-lg';
    if (size === 'md') sizeStyles = 'min-h-[48px] px-4 text-base';
    if (size === 'xl' || variant === 'huge') sizeStyles = 'min-h-[72px] px-8 text-xl text-center w-full';

    let variantStyles = 'bg-lime text-black shadow-lg hover:brightness-105';
    if (variant === 'secondary') {
      variantStyles = 'bg-grey-900 border border-grey-700 text-text hover:bg-grey-700';
    } else if (variant === 'danger') {
      variantStyles = 'bg-danger text-text hover:brightness-110';
    } else if (variant === 'ghost') {
      variantStyles = 'bg-transparent text-text hover:bg-grey-900 border border-transparent';
    } else if (variant === 'huge') {
      variantStyles = 'bg-lime text-black font-extrabold shadow-2xl hover:brightness-105';
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
