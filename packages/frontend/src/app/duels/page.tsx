'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { PageContainer, PageHeader } from '@/components/ui/PageShell';
import { DuelPageSkeleton } from '@/components/ui/Skeleton';
import { Card, CardBody } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/Toast';

export default function DuelsDashboard() {
  const { token, isLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [difficulty, setDifficulty] = useState('easy');
  const [duration, setDuration] = useState('30');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await fetch('http://localhost:4000/api/duels/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ difficulty, duration_mins: duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');
      toast.success('Duel room created!');
      router.push(`/duels/${data.code}`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setJoining(true);
    try {
      const res = await fetch('http://localhost:4000/api/duels/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: joinCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join lobby');
      toast.success('Joined duel room!');
      router.push(`/duels/${data.code}`);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setJoining(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <DuelPageSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        dark
        eyebrow="Duel Arena"
        title="Challenge a rival, sharpen your code, and finish first."
        description="Create or join a duel room instantly, then submit your answer to compete in real-time. Your best accepted submission decides the winner."
      />

      {error && <Alert className="mb-8">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Create a Duel Room</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Choose the difficulty and duration, then invite your opponent with a secure duel code.
            </p>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <Label>Difficulty</Label>
                <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min={5}
                  max={180}
                />
              </div>
              <Button type="submit" variant="accent" size="full" disabled={creating}>
                {creating ? 'Creating...' : 'Create Duel Room'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Join with a Code</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Have a code from a friend? Enter it here to join their duel room instantly.
            </p>
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <Label>Duel Code</Label>
                <Input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="X8A2KB"
                  required
                  className="uppercase tracking-widest font-mono"
                />
              </div>
              <Button type="submit" variant="accent" size="full" disabled={joining}>
                {joining ? 'Joining...' : 'Join Duel'}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  );
}
