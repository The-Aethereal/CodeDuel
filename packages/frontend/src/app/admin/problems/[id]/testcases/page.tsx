'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, EmptyState, LoadingState } from '@/components/ui/PageShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/Toast';

interface TestCase {
  id: string;
  input_data: string;
  expected_output: string;
  is_sample: boolean;
  order_index: number;
}

export default function AdminTestCasePage() {
  const { id } = useParams();
  const { token, user, isLoading } = useAuth();
  const toast = useToast();

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [error, setError] = useState('');

  const [inputData, setInputData] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading || !token || user?.role !== 'admin') return;

    fetchTestCases();
  }, [id, token, user, isLoading]);

  const fetchTestCases = async () => {
    try {
      const res = await fetch(`http://localhost:4000/api/testcases/problem/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch test cases');
      const data = await res.json();
      setTestCases(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputData.trim() || !expectedOutput.trim()) {
      toast.warning('Input and Expected Output are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:4000/api/testcases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problem_id: id,
          input_data: inputData,
          expected_output: expectedOutput,
          is_sample: isSample,
          order_index: testCases.length,
        })
      });

      if (!res.ok) throw new Error('Failed to create test case');

      setInputData('');
      setExpectedOutput('');
      setIsSample(false);
      fetchTestCases();
      toast.success('Test case added!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (testCaseId: string) => {
    if (!confirm('Are you sure you want to delete this test case?')) return;

    try {
      const res = await fetch(`http://localhost:4000/api/testcases/${testCaseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete test case');
      fetchTestCases();
      toast.success('Test case deleted.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/testcases" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200">
          ← Back to manage test cases
        </Link>
      </div>

      <PageHeader
        eyebrow="Admin"
        title="Manage Test Cases"
        description={`Problem ID: ${id}`}
      />

      {error && <Alert className="mb-6">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 h-fit">
          <CardBody>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Add New Test Case</h2>
            <form onSubmit={handleAddTestCase} className="space-y-4">
              <div>
                <Label>Input Data</Label>
                <Textarea
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  className="font-mono text-sm h-32"
                  placeholder="e.g. 5&#10;1 2 3 4 5"
                  required
                />
              </div>
              <div>
                <Label>Expected Output</Label>
                <Textarea
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  className="font-mono text-sm h-32"
                  placeholder="e.g. 15"
                  required
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="isSample"
                  checked={isSample}
                  onChange={(e) => setIsSample(e.target.checked)}
                  className="h-4 w-4 text-sky-600 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Is sample test case? (Visible to users)</span>
              </label>
              <Button type="submit" size="full" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Test Case'}
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Existing Test Cases ({testCases.length})
          </h2>

          {testCases.length === 0 ? (
            <EmptyState title="No test cases added yet." />
          ) : (
            testCases.map((tc, index) => (
              <Card key={tc.id} className="relative">
                <CardBody className="pr-28">
                  <div className="absolute top-4 right-4 flex items-center gap-3">
                    <Badge variant={tc.is_sample ? 'success' : 'default'}>
                      {tc.is_sample ? 'Sample' : 'Hidden'}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleDelete(tc.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium transition-colors duration-200"
                    >
                      Delete
                    </button>
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Test Case #{index + 1}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Input</span>
                      <pre className="mt-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono overflow-x-auto max-h-32">
                        {tc.input_data}
                      </pre>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Expected Output</span>
                      <pre className="mt-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono overflow-x-auto max-h-32">
                        {tc.expected_output}
                      </pre>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>
    </>
  );
}
