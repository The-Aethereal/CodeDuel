'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { LoadingState } from '@/components/ui/PageShell';
import AdminNav from '@/components/AdminNav';

export default function AdminShell({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/problems');
    }
  }, [user, isLoading, router]);

  if (isLoading) return <LoadingState message="Loading admin workspace..." />;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="page-container page-section animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-24 rounded-card-lg border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-3 shadow-soft">
            <AdminNav />
          </div>
        </aside>
        <div className="flex-grow min-w-0">{children}</div>
      </div>
    </div>
  );
}
