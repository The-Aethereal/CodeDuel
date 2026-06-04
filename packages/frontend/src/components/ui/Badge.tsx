import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-sky-50 text-sky-700 border-sky-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function difficultyVariant(difficulty: string): keyof typeof variants {
  const d = difficulty.toLowerCase();
  if (d === 'easy') return 'easy';
  if (d === 'medium') return 'medium';
  if (d === 'hard') return 'hard';
  return 'default';
}

export function statusVariant(status: string): keyof typeof variants {
  if (status === 'accepted') return 'success';
  if (['queued', 'running', 'pending'].includes(status)) return 'warning';
  if (status === 'published' || status === 'Published') return 'success';
  if (status === 'Draft' || status === 'draft') return 'warning';
  return 'danger';
}
