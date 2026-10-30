import React from 'react';

export interface BigIconTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

export function BigIconTile({
  icon,
  title,
  subtitle,
  onClick,
  selected = false,
  disabled = false,
  className = '',
}: BigIconTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`glass-card min-h-[96px] w-full p-4 flex items-center gap-4 text-start transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-lime disabled:opacity-50 ${
        selected ? 'border-2 border-lime ring-2 ring-lime/40 bg-lime/10' : 'hover:border-grey-500'
      } ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-grey-900 border border-grey-700 flex items-center justify-center text-lime shrink-0 shadow-inner">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-bold leading-tight text-text">{title}</h3>
        {subtitle && <p className="text-base text-grey-300 mt-1 leading-snug">{subtitle}</p>}
      </div>
    </button>
  );
}
