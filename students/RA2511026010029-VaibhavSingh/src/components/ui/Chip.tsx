import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, ShieldAlert } from 'lucide-react';

export type ChipStatus = 'PAID' | 'OPEN' | 'URGENT' | 'NEEDS_REVIEW' | 'MATCH' | 'SETTLED' | 'IN_PROGRESS';

export interface ChipProps {
  status: ChipStatus;
  label?: string;
  className?: string;
}

export function Chip({ status, label, className = '' }: ChipProps) {
  let displayLabel = label;
  let icon = <Clock className="w-3.5 h-3.5" />;
  let colorStyles = 'bg-grey-700 text-text border-grey-500';

  switch (status) {
    case 'MATCH':
    case 'PAID':
    case 'SETTLED':
      displayLabel = displayLabel || 'PAID';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-lime" />;
      colorStyles = 'bg-lime/10 text-lime border-lime/30';
      break;
    case 'NEEDS_REVIEW':
      displayLabel = displayLabel || 'NEEDS REVIEW';
      icon = <AlertTriangle className="w-3.5 h-3.5 text-warn" />;
      colorStyles = 'bg-warn/10 text-warn border-warn/30';
      break;
    case 'URGENT':
      displayLabel = displayLabel || 'URGENT';
      icon = <AlertCircle className="w-3.5 h-3.5 text-danger" />;
      colorStyles = 'bg-danger/10 text-danger border-danger/30';
      break;
    case 'OPEN':
      displayLabel = displayLabel || 'OPEN';
      icon = <ShieldAlert className="w-3.5 h-3.5 text-text" />;
      colorStyles = 'bg-grey-900 text-text border-grey-700';
      break;
    case 'IN_PROGRESS':
      displayLabel = displayLabel || 'IN PROGRESS';
      icon = <Clock className="w-3.5 h-3.5 text-warn" />;
      colorStyles = 'bg-warn/15 text-warn border-warn/40';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-bold border tracking-wider select-none ${colorStyles} ${className}`}
    >
      {icon}
      <span>{displayLabel}</span>
    </span>
  );
}
