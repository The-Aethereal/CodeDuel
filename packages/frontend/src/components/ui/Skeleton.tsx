import { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-slate-200/80 dark:bg-slate-700/60',
        className
      )}
      aria-hidden
      {...props}
    />
  );
}

export function ProblemListSkeleton() {
  return (
    <div className="space-y-0 rounded-card-lg border border-slate-200/80 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-900">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3 max-w-xs" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function DuelPageSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-card-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-6 space-y-5"
        >
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-card-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-6 flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-card-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-6 flex flex-col items-center gap-2"
            >
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-card-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-6">
        <Skeleton className="h-6 w-56 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

export function SubmissionTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex gap-4 border-t border-slate-100 dark:border-slate-800">
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardWidgetSkeleton() {
  return (
    <div className="rounded-card-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-5 flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export function ProblemDetailSkeleton() {
  return (
    <div className="page-container py-4 space-y-4">
      <Skeleton className="h-4 w-48" />
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-4rem-2rem)]">
        <div className="md:w-1/2 rounded-card-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 overflow-hidden">
          <Skeleton className="h-12 w-full rounded-none" />
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
        <div className="md:w-1/2 rounded-card-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900">
          <Skeleton className="h-12 w-full rounded-none" />
          <Skeleton className="h-full min-h-[300px] w-full rounded-none" />
        </div>
      </div>
    </div>
  );
}
