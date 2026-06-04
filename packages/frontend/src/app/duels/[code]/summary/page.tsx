'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import Link from 'next/link';
import { PageContainer } from '@/components/ui/PageShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge, statusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/cn';

interface PlayerSummary {
  id: string;
  username: string;
  isWinner: boolean;
  eloShift: number;
  newElo: number;
  code: string;
  language: string;
  runtime: number | string;
  memory: number | string;
  status: string;
}

interface MatchSummary {
  problemTitle: string;
  duration: number;
  players: PlayerSummary[];
}

export default function PostMatchSummary() {
  const { code } = useParams();
  const { token } = useAuth();
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    fetch(`http://localhost:4000/api/duels/room/${code}/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || 'Failed to load duel summary');
          return;
        }
        if (data.error) {
          setError(data.error);
          return;
        }
        setSummary(data);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load duel summary');
      })
      .finally(() => setLoading(false));
  }, [code, token]);

  if (loading) {
    return (
      <PageContainer className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-card-lg" />
        <Skeleton className="h-64 w-full rounded-card-lg" />
      </PageContainer>
    );
  }
  if (error) {
    return (
      <PageContainer>
        <Alert>{error}</Alert>
      </PageContainer>
    );
  }
  if (!summary) {
    return (
      <PageContainer>
        <Alert>Failed to render match record.</Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-8">
      <div className="text-center rounded-card-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 shadow-card-lg">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Match Concluded</span>
        <h1 className="text-3xl font-bold mt-2">Match Review</h1>
        <p className="text-slate-400 text-sm mt-2">
          Challenge: <b className="text-white">{summary.problemTitle}</b>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {summary.players.map(player => (
          <Card
            key={player.id}
            className={cn(
              'relative overflow-hidden',
              player.isWinner && 'border-amber-300 ring-2 ring-amber-200/50'
            )}
          >
            {player.isWinner && (
              <span className="absolute top-0 right-0 bg-amber-400 text-amber-950 font-bold text-[10px] px-3 py-1 uppercase rounded-bl-lg tracking-wider">
                Winner
              </span>
            )}
            <CardBody>
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-bold text-slate-900">{player.username}</h2>
                <span
                  className={cn(
                    'text-xs font-bold',
                    player.eloShift >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {player.eloShift >= 0 ? `+${player.eloShift}` : player.eloShift} ELO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Global Rank: {player.newElo} pts</p>

              <div className="grid grid-cols-3 gap-2 my-4 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">Verdict</span>
                  <Badge variant={statusVariant(player.status)} className="mt-1">
                    {player.status === 'accepted' ? 'Passed' : player.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">Speed</span>
                  <span className="text-xs font-mono font-bold text-slate-700 mt-1 block">
                    {player.runtime === 'N/A' ? 'N/A' : `${player.runtime} ms`}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400">Memory</span>
                  <span className="text-xs font-mono font-bold text-slate-700 mt-1 block">
                    {player.memory === 'N/A' ? 'N/A' : `${player.memory} MB`}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-slate-50/80">
          <h3 className="text-sm font-semibold text-slate-700">Source Code Comparison</h3>
          <div className="flex flex-wrap gap-2">
            <Link href="/duels">
              <Button variant="accent" size="sm">
                Return to Matchmaking
              </Button>
            </Link>
            <Link href="/problems">
              <Button variant="secondary" size="sm">
                Browse Problems
              </Button>
            </Link>
          </div>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {summary.players.map(player => (
            <div key={player.id} className="flex flex-col">
              <div className="bg-slate-50/50 px-6 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500 flex justify-between">
                <span>{player.username}&apos;s solution</span>
                <span className="uppercase font-mono text-[10px]">{player.language}</span>
              </div>
              <pre className="p-6 bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto h-96 whitespace-pre-wrap leading-relaxed">
                <code>{player.code}</code>
              </pre>
            </div>
          ))}
        </div>
      </Card>
    </PageContainer>
  );
}
