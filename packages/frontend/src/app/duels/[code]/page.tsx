'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';
import { PageContainer } from '@/components/ui/PageShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/Toast';

interface Participant {
  user: { username: string; id: string };
}

export default function DuelLobby() {
  const { code } = useParams();
  const { user, token } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [lobbyUsers, setLobbyUsers] = useState<Participant[]>([]);
  const [creatorId, setCreatorId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    fetch(`http://localhost:4000/api/duels/room/${code}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        if (data.status === 'ONGOING' && data.problem?.slug) {
          router.push(`/problems/${data.problem.slug}?duel=${code}`);
          return;
        }
        setLobbyUsers(data.participants);
        setCreatorId(data.creator_id);
        setDifficulty(data.difficulty);
      })
      .catch(err => setError(err.message));

    socket.connect();
    socket.emit('join_lobby_room', code);

    socket.on('lobby_update', (participants: Participant[]) => {
      setLobbyUsers(participants);
    });

    socket.on('duel_started', (data: { problemSlug: string }) => {
      router.push(`/problems/${data.problemSlug}?duel=${code}`);
    });

    return () => {
      socket.off('lobby_update');
      socket.off('duel_started');
    };
  }, [code, token, router]);

  const startMatch = async () => {
    setError('');
    try {
      const res = await fetch(`http://localhost:4000/api/duels/room/${code}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Duel started!');
    } catch (err: any) { setError(err.message); toast.error(err.message); }
  };

  return (
    <PageContainer className="max-w-2xl">
      <div className="mb-4">
        <Link href="/duels" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← Back to Duels
        </Link>
      </div>
      <Card className="text-center">
        <CardBody className="p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 mb-2">Battle Arena Lobby</p>
          <div className="text-3xl sm:text-4xl font-bold font-mono tracking-wider text-slate-900 mb-6 bg-slate-50 py-4 rounded-xl border border-dashed border-slate-200 max-w-xs mx-auto">
            {code}
          </div>

          {error && <Alert className="mb-6 text-left">{error}</Alert>}

          <div className="text-left mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Competitors ({lobbyUsers.length})
            </h3>
            <ul className="divide-y divide-slate-100 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              {lobbyUsers.map(p => (
                <li key={p.user.id} className="px-4 py-3 flex justify-between items-center">
                  <span className="font-medium text-slate-800">{p.user.username}</span>
                  {p.user.id === creatorId && (
                    <Badge variant="warning" className="text-[10px] uppercase tracking-wide">
                      Host
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between items-center text-xs font-mono text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span>
              Tier: <b className="capitalize text-slate-800">{difficulty}</b>
            </span>
            <span>
              Status: <b className="text-amber-600 animate-pulse">Waiting...</b>
            </span>
          </div>

          {user?.id === creatorId ? (
            <Button size="full" onClick={startMatch}>
              Start Match
            </Button>
          ) : (
            <p className="text-sm text-slate-500 italic">Waiting for the host to start the match...</p>
          )}
        </CardBody>
      </Card>
    </PageContainer>
  );
}
