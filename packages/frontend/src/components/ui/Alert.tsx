import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  error: 'bg-red-50 text-red-800 border-red-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variants;
}

export function Alert({ className, variant = 'error', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('rounded-xl border px-4 py-3 text-sm animate-fade-in', variants[variant], className)}
      {...props}
    />
  );
}
