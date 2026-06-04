import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary:
    'bg-sky-600 text-white shadow-sm shadow-sky-600/20 hover:bg-sky-700 active:bg-sky-800 disabled:bg-sky-400',
  secondary:
    'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 active:bg-slate-100 dark:active:bg-slate-600 disabled:opacity-60',
  accent:
    'bg-slate-900 text-white shadow-sm shadow-slate-900/15 hover:bg-slate-800 active:bg-slate-950 disabled:bg-slate-600',
  ghost:
    'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:bg-slate-200/80 dark:active:bg-slate-700/80',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 disabled:bg-red-400',
  link: 'bg-transparent text-sky-600 hover:text-sky-700 hover:underline p-0 shadow-none',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-2.5 text-sm rounded-xl',
  full: 'w-full px-5 py-3 text-sm rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
