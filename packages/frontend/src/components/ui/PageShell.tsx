import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('page-container page-section animate-fade-in', className)} {...props} />;
}

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  dark?: boolean;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, action, dark, className }: PageHeaderProps) {
  if (dark) {
    return (
      <div
        className={cn(
          'rounded-card-lg bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 sm:p-10 text-white shadow-card-lg mb-8',
          className
        )}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400 mb-2">{eyebrow}</p>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
            {description && <p className="mt-3 text-slate-300 text-base leading-relaxed">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8', className)}>
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400 mb-2">{eyebrow}</p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {description && <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'text-center py-16 px-6 rounded-card-lg border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30',
        className
      )}
    >
      <p className="text-slate-700 dark:text-slate-300 font-medium">{title}</p>
      {description && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
      <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-sky-600 animate-spin" aria-hidden />
      <p className="text-sm">{message}</p>
    </div>
  );
}
