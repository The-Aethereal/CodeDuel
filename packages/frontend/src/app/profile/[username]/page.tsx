'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageContainer } from '@/components/ui/PageShell';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, statusVariant } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import BackToTop from '@/components/BackToTop';
import { cn } from '@/lib/cn';

interface ProfileData {
  user: {
    username: string;
    role: string;
    created_at: string;
  };
  stats: {
    totalSubmissions: number;
    acceptedSubmissions: number;
    accuracy: number | string;
    streak?: number;
  };
  activityMap: Record<string, number>;
  recentSubmissions: Array<{
    id: string;
    language: string;
    status: string;
    submitted_at: string;
    problem: { title: string; slug: string };
  }>;
}

export default function ProfilePage() {
  const { username } = useParams();
  const { token, isLoading, user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');

  const heatmapDays = Array.from({ length: 365 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (364 - i));
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/users/${username}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch profile');
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchProfile();
  }, [username, token, isLoading, router]);

  const getActivityColor = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (count <= 2) return 'bg-emerald-200 dark:bg-emerald-900';
    if (count <= 5) return 'bg-emerald-400 dark:bg-emerald-700';
    if (count <= 10) return 'bg-emerald-600';
    return 'bg-emerald-800';
  };

  if (error) {
    return (
      <PageContainer>
        <Alert>{error}</Alert>
      </PageContainer>
    );
  }
  if (!profile) return <PageContainer><ProfileSkeleton /></PageContainer>;

  const streak = profile.stats.streak ?? 0;

  return (
    <>
    <PageContainer className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/problems" className="hover:text-sky-700 dark:hover:text-sky-400 transition-colors duration-200">
          Problems
        </Link>
        <span aria-hidden>/</span>
        <Link href="/duels" className="hover:text-sky-700 dark:hover:text-sky-400 transition-colors duration-200">
          Duels
        </Link>
        {user?.role === 'admin' && (
          <>
            <span aria-hidden>/</span>
            <Link href="/admin/problems" className="hover:text-sky-700 dark:hover:text-sky-400 transition-colors duration-200">
              Admin
            </Link>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="h-16 w-16 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-2xl flex items-center justify-center text-2xl font-bold uppercase shrink-0">
              {profile.user.username.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{profile.user.username}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{profile.user.role}</p>
              <p className="text-xs text-slate-400 mt-1">
                Joined {new Date(profile.user.created_at).toLocaleDateString()}
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardBody className="flex flex-col items-center justify-center text-center py-6">
              <span className="text-3xl mb-1" aria-hidden>🔥</span>
              {streak > 0 ? (
                <>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {streak} {streak === 1 ? 'Day' : 'Days'}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">Current Streak</span>
                </>
              ) : (
                <>
                  <span className="text-lg font-semibold text-slate-600 dark:text-slate-400">No streak</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Solve a problem today</span>
                </>
              )}
            </CardBody>
          </Card>
          {[
            { value: profile.stats.totalSubmissions, label: 'Total Submissions', color: 'text-slate-800 dark:text-slate-100' },
            { value: profile.stats.acceptedSubmissions, label: 'Solved Problems', color: 'text-emerald-600 dark:text-emerald-400' },
            { value: `${profile.stats.accuracy}%`, label: 'Success Rate', color: 'text-sky-600 dark:text-sky-400' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardBody className="flex flex-col items-center justify-center text-center py-6">
                <span className={cn('text-3xl font-bold', stat.color)}>{stat.value}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</span>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardBody className="overflow-x-auto">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Submission Activity (Last 365 Days)</h2>
          <div className="min-w-max flex flex-col gap-1">
            <div className="grid grid-rows-7 grid-flow-col gap-1">
              {heatmapDays.map((dateStr) => {
                const count = profile.activityMap[dateStr] || 0;
                return (
                  <div
                    key={dateStr}
                    title={`${count} submissions on ${dateStr}`}
                    className={cn(
                      'w-3.5 h-3.5 rounded-sm transition-colors duration-200 hover:ring-1 hover:ring-slate-400 cursor-help',
                      getActivityColor(count)
                    )}
                  />
                );
              })}
            </div>
            <div className="flex justify-end items-center text-xs text-slate-500 dark:text-slate-400 mt-2 gap-2">
              <span>Less</span>
              <div className={cn('w-3 h-3 rounded-sm', getActivityColor(0))} />
              <div className={cn('w-3 h-3 rounded-sm', getActivityColor(1))} />
              <div className={cn('w-3 h-3 rounded-sm', getActivityColor(4))} />
              <div className={cn('w-3 h-3 rounded-sm', getActivityColor(8))} />
              <div className={cn('w-3 h-3 rounded-sm', getActivityColor(12))} />
              <span>More</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="bg-slate-50/80 dark:bg-slate-800/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Submissions</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <th className="px-6 py-3 font-medium text-slate-600 dark:text-slate-400">Problem</th>
                <th className="px-6 py-3 font-medium text-slate-600 dark:text-slate-400">Time Submitted</th>
                <th className="px-6 py-3 font-medium text-slate-600 dark:text-slate-400">Language</th>
                <th className="px-6 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {profile.recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                    No recent submissions.
                  </td>
                </tr>
              ) : (
                profile.recentSubmissions.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="px-6 py-3">
                      <Link
                        href={`/problems/${sub.problem.slug}`}
                        className="text-sky-600 dark:text-sky-400 hover:text-sky-700 font-medium"
                      >
                        {sub.problem.title}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(sub.submitted_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 uppercase font-mono text-xs text-slate-600 dark:text-slate-400">{sub.language}</td>
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant(sub.status)}>{sub.status.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
    <BackToTop />
    </>
  );
}
