import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
}

export function Card({ children, as: Component = 'div', className = '', ...props }: CardProps) {
  return (
    <Component className={`glass-card p-5 ${className}`} {...props}>
      {children}
    </Component>
  );
}
