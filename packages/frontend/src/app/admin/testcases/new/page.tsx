'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { PageHeader } from '@/components/ui/PageShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface Problem {
  id: string;
  title: string;
  slug: string;
}

export default function CreateTestCasesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblemId, setSelectedProblemId] = useState('');

  useEffect(() => {
    const fetchProblems = async () => {
      const res = await fetch('http://localhost:4000/api/problems', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProblems(data);
        if (data.length > 0) {
          setSelectedProblemId(data[0].id);
        }
      }
    };

    if (token) fetchProblems();
  }, [token]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProblemId) {
      router.push(`/admin/problems/${selectedProblemId}/testcases`);
    }
  };

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/testcases" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200">
          ← Back to manage test cases
        </Link>
      </div>

      <PageHeader
        eyebrow="Admin"
        title="Create Test Cases"
        description="Choose a problem, then add input/output pairs and sample cases."
      />

      <Card className="max-w-lg">
        <CardBody>
          {problems.length === 0 ? (
            <div className="text-center py-6 space-y-4">
              <p className="text-slate-600 dark:text-slate-300">You need at least one problem before adding test cases.</p>
              <Link href="/admin/problems/new">
                <Button>Create a Problem</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleContinue} className="space-y-5">
              <div>
                <Label htmlFor="problem-select">Select Problem</Label>
                <Select
                  id="problem-select"
                  value={selectedProblemId}
                  onChange={(e) => setSelectedProblemId(e.target.value)}
                >
                  {problems.map((prob) => (
                    <option key={prob.id} value={prob.id}>
                      {prob.title} ({prob.slug})
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" size="full">
                Continue to Add Test Cases
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </>
  );
}
