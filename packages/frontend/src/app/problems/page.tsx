'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageContainer, PageHeader, EmptyState } from '@/components/ui/PageShell';
import { ProblemListSkeleton, DashboardWidgetSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { Card, CardBody } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, difficultyVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProblemStatusIndicator, ProblemUserStatus } from '@/components/ProblemStatusIndicator';
import { cn } from '@/lib/cn';

interface Tag {
  id: string;
  name: string;
}

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  tags: Tag[];
  userStatus?: ProblemUserStatus;
}

function StreakWidget({ streak, loading }: { streak: number | null; loading: boolean }) {
  if (loading) return <DashboardWidgetSkeleton />;

  return (
    <Card>
      <CardBody className="flex items-center gap-4 py-5">
        <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-2xl shrink-0">
          🔥
        </div>
        <div>
          {streak !== null && streak > 0 ? (
            <>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                Current Streak: {streak} {streak === 1 ? 'Day' : 'Days'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Keep solving to extend your streak!
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">No active streak</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Get an accepted submission today to start one.
              </p>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function ProblemDashboardContent() {
  const { token, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [problems, setProblems] = useState<Problem[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [streak, setStreak] = useState<number | null>(null);
  const [streakLoading, setStreakLoading] = useState(false);

  const searchQuery = searchParams.get('search') || '';
  const difficultyQuery = searchParams.get('difficulty') || 'all';
  const statusQuery = searchParams.get('status') || 'all';
  const selectedTags = searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [];

  useEffect(() => {
    fetch('http://localhost:4000/api/tags')
      .then(res => res.json())
      .then(data => setAvailableTags(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    setIsFetching(true);
    const query = searchParams.toString();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`http://localhost:4000/api/problems?${query}`, { headers })
      .then(res => res.json())
      .then(data => setProblems(data))
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, [searchParams, token, isLoading]);

  useEffect(() => {
    if (!token || !user) return;
    setStreakLoading(true);
    fetch(`http://localhost:4000/api/users/${user.username}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setStreak(data.stats?.streak ?? 0))
      .catch(() => setStreak(0))
      .finally(() => setStreakLoading(false));
  }, [token, user]);

  const updateQuery = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const toggleTag = (tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    updateQuery('tags', newTags.join(','));
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-72 shrink-0">
            <Card><CardBody className="space-y-4 p-5"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></CardBody></Card>
          </aside>
          <main className="flex-grow min-w-0 space-y-6">
            <Skeleton className="h-10 w-64" />
            <ProblemListSkeleton />
          </main>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {token && user && (
        <div className="mb-6">
          <StreakWidget streak={streak} loading={streakLoading} />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-72 shrink-0">
          <Card className="sticky top-24">
            <CardBody className="space-y-6 p-5">
              <div>
                <Label>Search</Label>
                <Input
                  type="text"
                  placeholder="e.g. Two Sum"
                  value={searchQuery}
                  onChange={(e) => updateQuery('search', e.target.value)}
                />
              </div>

              <div>
                <Label>Status</Label>
                {!token ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    Log in to track status.
                  </p>
                ) : (
                  <Select value={statusQuery} onChange={(e) => updateQuery('status', e.target.value)}>
                    <option value="all">All Problems</option>
                    <option value="solved">Solved</option>
                    <option value="attempted">Attempted</option>
                    <option value="unsolved">Unsolved</option>
                  </Select>
                )}
              </div>

              <div>
                <Label>Difficulty</Label>
                <div className="flex flex-col gap-2 mt-1">
                  {['all', 'easy', 'medium', 'hard'].map(diff => (
                    <label key={diff} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="radio"
                        name="difficulty"
                        checked={difficultyQuery === diff}
                        onChange={() => updateQuery('difficulty', diff)}
                        className="text-sky-600 focus:ring-sky-500 border-slate-300"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize group-hover:text-slate-900 dark:group-hover:text-white">{diff}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                      className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors duration-200',
                        selectedTags.includes(tag.name)
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </aside>

        <main className="flex-grow min-w-0">
          <PageHeader
            eyebrow="Practice"
            title="Algorithm Challenges"
            description="Filter by difficulty, status, and tags to find your next challenge."
          />

          {isFetching ? (
            <ProblemListSkeleton />
          ) : problems.length === 0 ? (
            <EmptyState
              title="No problems match your filters"
              description="Try adjusting your search or clearing filters."
              action={
                <Button variant="link" onClick={() => router.push('/problems')}>
                  Clear all filters
                </Button>
              }
            />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {problems.map(prob => (
                  <li key={prob.id}>
                    <Link
                      href={`/problems/${prob.slug}`}
                      className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200 group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {token && (
                          <ProblemStatusIndicator
                            status={prob.userStatus ?? 'unsolved'}
                            className="shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors truncate">
                            {prob.title}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <Badge variant={difficultyVariant(prob.difficulty)}>{prob.difficulty}</Badge>
                            {prob.tags?.length > 0 &&
                              prob.tags.map(tag => (
                                <Badge key={tag.id} variant="default">
                                  {tag.name}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-slate-300 dark:text-slate-600 group-hover:text-sky-500 transition-colors shrink-0" aria-hidden>
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </main>
      </div>
    </PageContainer>
  );
}

export default function ProblemsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <ProblemListSkeleton />
        </PageContainer>
      }
    >
      <ProblemDashboardContent />
    </Suspense>
  );
}
