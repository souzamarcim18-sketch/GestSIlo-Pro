'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right' | 'top' | 'bottom';
  children: string | React.ReactNode;
}

function Tooltip({ children }: TooltipProps) {
  return <div data-slot="tooltip">{children}</div>;
}

function TooltipTrigger({ className, children, ...props }: TooltipTriggerProps) {
  return (
    <div
      data-slot="tooltip-trigger"
      className={cn('group relative inline-block', className)}
      {...props}
    >
      {children}
    </div>
  );
}

function TooltipContent({
  side = 'right',
  className,
  children,
  ...props
}: TooltipContentProps) {
  const sideClasses = {
    right: 'left-full ml-2 -translate-y-1/2 top-1/2',
    left: 'right-full mr-2 -translate-y-1/2 top-1/2',
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      data-slot="tooltip-content"
      className={cn(
        'absolute z-50 px-2.5 py-1.5 text-xs font-medium rounded-md bg-foreground text-background shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150',
        sideClasses[side],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger };
