'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { PageHeader } from '@/components/ui/PageShell';
import { Card } from '@/components/ui/Card';
import { Badge, difficultyVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  is_published: boolean;
}

export default function AdminProblemsPage() {
  const { token, user, isLoading } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);

  useEffect(() => {
    if (isLoading || !user || user.role !== 'admin') return;

    const fetchAdminProblems = async () => {
      const res = await fetch('http://localhost:4000/api/problems', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProblems(await res.json());
      }
    };

    fetchAdminProblems();
  }, [user, isLoading, token]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Problem Management"
        description="Create, publish, and manage test cases for platform problems."
        action={
          <Link href="/admin/problems/new">
            <Button>+ Create New Problem</Button>
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left font-semibold uppercase tracking-wider text-xs">Title / Slug</th>
                <th className="px-6 py-3 text-left font-semibold uppercase tracking-wider text-xs">Difficulty</th>
                <th className="px-6 py-3 text-left font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-3 text-right font-semibold uppercase tracking-wider text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {problems.map((prob) => (
                <tr key={prob.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{prob.title}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs font-mono mt-0.5">{prob.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={difficultyVariant(prob.difficulty)}>{prob.difficulty}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={prob.is_published ? 'success' : 'warning'}>
                      {prob.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/problems/${prob.id}/testcases`}
                      className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium text-sm transition-colors duration-200"
                    >
                      Test Cases
                    </Link>
                  </td>
                </tr>
              ))}
              {problems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No problems found. Start by creating one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
