'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { socket } from '@/lib/socket';
import Editor from '@monaco-editor/react';
import { useTheme } from '@/lib/ThemeContext';
import { useToast } from '@/components/ui/Toast';
import { ProblemDetailSkeleton, SubmissionTableSkeleton } from '@/components/ui/Skeleton';
import { Badge, difficultyVariant, statusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import BackToTop from '@/components/BackToTop';
import { saveCodeDraft, loadCodeDraft } from '@/lib/codeDrafts';
import { cn } from '@/lib/cn';

interface Problem {
  id: string;
  title: string;
  description: string;
  input_format: string;
  output_format: string;
  constraints: string;
  difficulty: string;
  time_limit_ms: number;
  memory_limit_mb: number;
}

interface PastSubmission {
  id: string;
  language: string;
  status: string;
  exec_time_ms: number | null;
  memory_used_mb: number | null;
  submitted_at: string;
}

interface RealtimeUpdate {
  submissionId: string;
  status: string;
  exec_time_ms?: number;
  memory_used_mb?: number;
  score?: number;
}

interface OpponentProgress {
  userId: string;
  passedTests: number;
  totalTests: number;
}

const LANGUAGES = [
  { id: 'cpp', name: 'C++', monacoLang: 'cpp' },
  { id: 'python', name: 'Python', monacoLang: 'python' },
  { id: 'java', name: 'Java', monacoLang: 'java' },
  { id: 'javascript', name: 'JavaScript', monacoLang: 'javascript' },
  { id: 'go', name: 'Go', monacoLang: 'go' },
  { id: 'rust', name: 'Rust', monacoLang: 'rust' },
];

const LANGUAGE_TEMPLATES: Record<string, string> = {
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Fast I/O\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Write your code here\n    return 0;\n}`,
  python: `import sys\n\ndef main():\n    # Write your code here\n    pass\n\nif __name__ == '__main__':\n    main()`,
  java: `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}`,
  javascript: `const fs = require('fs');\n\nfunction main() {\n    // Write your code here\n}\n\nmain();`,
  go: `package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n}`,
  rust: `use std::io::{self, BufRead};\n\nfn main() {\n    // Write your code here\n}`
};

const DRAFT_SAVE_INTERVAL_MS = 3000;

export default function ProblemDetailsPage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, isLoading, user } = useAuth();
  const { resolvedTheme } = useTheme();
  const toast = useToast();
  const duelCode = searchParams.get('duel') || undefined;
  const problemSlug = String(slug);

  const [problem, setProblem] = useState<Problem | null>(null);
  const [error, setError] = useState('');
  const [duelMessage, setDuelMessage] = useState('');

  const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');
  const [pastSubmissions, setPastSubmissions] = useState<PastSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[1]);
  const [sourceCode, setSourceCode] = useState(LANGUAGE_TEMPLATES['python']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const [submissionResult, setSubmissionResult] = useState<RealtimeUpdate | null>(null);
  const currentSubIdRef = useRef<string | null>(null);
  const draftInitializedRef = useRef(false);

  const [liveTestProgress, setLiveTestProgress] = useState<{
    testIndex: number;
    totalTests: number;
    verdict: string;
  } | null>(null);

  const [opponentProgress, setOpponentProgress] = useState<OpponentProgress | null>(null);

  const fetchPastSubmissions = useCallback(async (problemId: string) => {
    if (!token) return;
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`http://localhost:4000/api/submissions/problem/${problemId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPastSubmissions(data);
      }
    } catch (err) {
      console.error('Failed to load past submissions', err);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [token]);

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchProblem = async () => {
      try {
        const res = await fetch(`http://localhost:4000/api/problems/${slug}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Problem not found or unauthorized');
        const data = await res.json();
        setProblem(data);
        fetchPastSubmissions(data.id);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchProblem();
  }, [slug, token, isLoading, router, fetchPastSubmissions]);

  // Restore code draft when problem/language is ready
  useEffect(() => {
    if (!problem || draftInitializedRef.current) return;
    const draft = loadCodeDraft(problemSlug, selectedLanguage.id);
    if (draft) {
      setSourceCode(draft);
      setDraftRestored(true);
    }
    draftInitializedRef.current = true;
  }, [problem, problemSlug, selectedLanguage.id]);

  // Auto-save draft every few seconds
  useEffect(() => {
    if (!problem) return;
    const interval = window.setInterval(() => {
      saveCodeDraft(problemSlug, selectedLanguage.id, sourceCode);
    }, DRAFT_SAVE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [problem, problemSlug, selectedLanguage.id, sourceCode]);

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!duelCode) return;
    socket.emit('join_lobby_room', duelCode.toUpperCase());
  }, [duelCode]);

  useEffect(() => {
    socket.on('submission_update', (data: RealtimeUpdate) => {
      if (data.submissionId === currentSubIdRef.current) {
        setSubmissionResult(data);

        if (['accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compile_error', 'internal_error'].includes(data.status)) {
          setLiveTestProgress(null);
          if (problem) fetchPastSubmissions(problem.id);

          if (data.status === 'accepted') {
            toast.success('Submission accepted!');
          } else if (data.status !== 'queued' && data.status !== 'running') {
            toast.error(`Submission failed: ${data.status.replace(/_/g, ' ')}`);
          }
        }
      }
    });

    socket.on('test_case_update', (data: any) => {
      if (data.submissionId === currentSubIdRef.current) {
        setLiveTestProgress({
          testIndex: data.testIndex,
          totalTests: data.totalTests,
          verdict: data.verdict,
        });
      }
    });

    return () => {
      if (currentSubIdRef.current) socket.emit('unsubscribe_submission', currentSubIdRef.current);
      socket.off('submission_update');
      socket.off('test_case_update');
    };
  }, [problem, fetchPastSubmissions, toast]);

  useEffect(() => {
    if (!duelCode) return;

    socket.on('opponent_progress', (data: OpponentProgress) => {
      if (data.userId !== user?.id) {
        setOpponentProgress(data);
      }
    });

    socket.on('duel_finished', () => {
      router.push(`/duels/${duelCode.toUpperCase()}/summary`);
    });

    return () => {
      socket.off('opponent_progress');
      socket.off('duel_finished');
    };
  }, [duelCode, router, user?.id]);

  const handleTabChange = (tab: 'description' | 'submissions') => {
    setActiveTab(tab);
    if (tab === 'submissions' && problem) {
      fetchPastSubmissions(problem.id);
    }
  };

  const handleLanguageChange = (langId: string) => {
    if (problem) {
      saveCodeDraft(problemSlug, selectedLanguage.id, sourceCode);
    }
    const targetLang = LANGUAGES.find(l => l.id === langId);
    if (!targetLang) return;
    setSelectedLanguage(targetLang);
    const draft = loadCodeDraft(problemSlug, langId);
    setSourceCode(draft ?? LANGUAGE_TEMPLATES[langId] ?? '');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Problem link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleSubmission = async () => {
    if (!sourceCode?.trim()) {
      toast.warning('Please enter some code before submitting.');
      return;
    }

    setIsSubmitting(true);

    if (currentSubIdRef.current) {
      socket.emit('unsubscribe_submission', currentSubIdRef.current);
    }

    try {
      const res = await fetch('http://localhost:4000/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          problem_id: problem?.id,
          language: selectedLanguage.id,
          source_code: sourceCode,
          duel_code: duelCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      currentSubIdRef.current = data.submission_id;

      setSubmissionResult({
        submissionId: data.submission_id,
        status: data.status,
      });

      socket.emit('subscribe_submission', data.submission_id);
      toast.info('Submission queued for evaluation');

      if (problem) {
        fetchPastSubmissions(problem.id);
      }

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVerdictStyles = (status: string) => {
    switch(status) {
      case 'accepted': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'queued': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse';
      case 'running': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-spin-slow';
      default: return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  if (error) {
    return (
      <div className="page-container page-section">
        <Alert>{error}</Alert>
      </div>
    );
  }
  if (!problem) return <ProblemDetailSkeleton />;

  const tabClass = (tab: 'description' | 'submissions') =>
    cn(
      'px-6 py-3 border-b-2 font-semibold text-sm transition-colors duration-200',
      activeTab === tab
        ? 'border-sky-600 text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-900'
        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
    );

  const editorTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light';

  return (
    <>
    <div className="page-container py-4 flex flex-col gap-3 animate-fade-in">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 shrink-0">
        <Link href="/problems" className="hover:text-sky-700 dark:hover:text-sky-400 transition-colors duration-200">
          Problems
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-800 dark:text-slate-200 font-medium truncate">{problem.title}</span>
        {duelCode && (
          <>
            <span className="text-slate-300 dark:text-slate-600 mx-1">·</span>
            <Link href={`/duels/${duelCode}`} className="text-sky-600 dark:text-sky-400 hover:text-sky-700 font-medium">
              Duel Lobby ({duelCode.toUpperCase()})
            </Link>
          </>
        )}
      </nav>

      {duelCode && opponentProgress && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-4 py-3 text-sm text-violet-900 dark:text-violet-200 transition-all duration-200">
          <span className="font-semibold">Opponent Progress:</span>{' '}
          {opponentProgress.passedTests}/{opponentProgress.totalTests} Tests Passed
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-4rem-2rem)]">
      {duelMessage && (
        <Alert variant="success" className="w-full mb-0 md:col-span-2">
          {duelMessage}
        </Alert>
      )}

      <div className="md:w-1/2 bg-white dark:bg-slate-900 rounded-card-lg shadow-soft border border-slate-200/80 dark:border-slate-700/80 flex flex-col overflow-hidden transition-colors duration-200">
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <button type="button" onClick={() => handleTabChange('description')} className={tabClass('description')}>
            Description
          </button>
          <button type="button" onClick={() => handleTabChange('submissions')} className={cn(tabClass('submissions'), 'flex items-center gap-2')}>
            Submissions
            {pastSubmissions.length > 0 && (
              <span
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-bold',
                  activeTab === 'submissions' ? 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}
              >
                {pastSubmissions.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-grow p-6 overflow-y-auto" id="problem-statement">
          {activeTab === 'description' ? (
            <div className="prose max-w-none text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">
              <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{problem.title}</h1>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                    Copy Link
                  </Button>
                  <Badge variant={difficultyVariant(problem.difficulty)}>{problem.difficulty}</Badge>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <span>Time Limit: {problem.time_limit_ms / 1000}s</span>
                <span>Memory Limit: {problem.memory_limit_mb}MB</span>
              </div>
              <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">Description</h3>
              <p className="mb-4 leading-relaxed">{problem.description}</p>
              {problem.input_format && <><h3 className="font-semibold text-base mt-6 mb-2 text-slate-900 dark:text-white">Input Format</h3><p className="mb-4 leading-relaxed">{problem.input_format}</p></>}
              {problem.output_format && <><h3 className="font-semibold text-base mt-6 mb-2 text-slate-900 dark:text-white">Output Format</h3><p className="mb-4 leading-relaxed">{problem.output_format}</p></>}
              {problem.constraints && <><h3 className="font-semibold text-base mt-6 mb-2 text-slate-900 dark:text-white">Constraints</h3><pre className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs mb-4">{problem.constraints}</pre></>}
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-white">Your Past Attempts</h3>
              {loadingSubmissions && pastSubmissions.length === 0 ? (
                <SubmissionTableSkeleton rows={4} />
              ) : pastSubmissions.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                  <p className="text-sm">No submissions recorded for this challenge yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-soft">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Language</th>
                        <th className="px-4 py-3">Runtime</th>
                        <th className="px-4 py-3">Memory</th>
                        <th className="px-4 py-3 text-right">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-medium">
                      {pastSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200">
                          <td className="px-4 py-3">
                            <Badge
                              variant={statusVariant(sub.status)}
                              className={['queued', 'running'].includes(sub.status) ? 'animate-pulse' : ''}
                            >
                              {sub.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 uppercase font-mono text-slate-600 dark:text-slate-400 text-[11px]">{sub.language}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono">{sub.exec_time_ms !== null ? `${sub.exec_time_ms} ms` : '—'}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono">{sub.memory_used_mb !== null ? `${sub.memory_used_mb.toFixed(1)} MB` : '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-400 font-mono text-[11px]">
                            {new Date(sub.submitted_at).toLocaleDateString() === new Date().toLocaleDateString() ? new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(sub.submitted_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="md:w-1/2 flex flex-col bg-white dark:bg-slate-900 rounded-card-lg shadow-soft border border-slate-200/80 dark:border-slate-700/80 overflow-hidden transition-colors duration-200">
        <div className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 p-3 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Select
              value={selectedLanguage.id}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-auto max-w-[10rem] py-1.5 text-sm"
            >
              {LANGUAGES.map(lang => (<option key={lang.id} value={lang.id}>{lang.name}</option>))}
            </Select>
            {draftRestored && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:inline">Draft restored</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleSubmission}
            disabled={isSubmitting || (submissionResult?.status === 'queued' || submissionResult?.status === 'running')}
          >
            {isSubmitting ? 'Sending...' : 'Run Code'}
          </Button>
        </div>

        <div className="flex-grow w-full relative min-h-[300px]">
          <Editor height="100%" width="100%" language={selectedLanguage.monacoLang} theme={editorTheme} value={sourceCode} onChange={(value) => setSourceCode(value || '')} options={{ fontSize: 14, fontFamily: 'var(--font-mono), monospace', minimap: { enabled: false }, automaticLayout: true, scrollBeyondLastLine: false, lineNumbers: 'on', wordWrap: 'on', tabSize: 4, insertSpaces: true, autoClosingBrackets: 'always', autoClosingQuotes: 'always' }} loading={<div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 text-sm">Initializing IDE environment...</div>}/>
        </div>

        {submissionResult && (
          <div className="bg-slate-900 border-t border-slate-800 p-4 text-white transition-all duration-200">
            <div className="flex justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Live Evaluation</h4>
                <p className="text-[11px] text-slate-500 font-mono">ID: {submissionResult.submissionId}</p>
              </div>
              <span className={cn('px-3 py-1 border rounded-lg font-mono text-xs uppercase font-bold transition-colors duration-200', getVerdictStyles(submissionResult.status))}>
                {submissionResult.status.replace('_', ' ')}
              </span>
            </div>

            {submissionResult.status === 'running' && liveTestProgress && (
              <div className="mt-4">
                <div className="flex justify-between text-xs font-mono text-sky-400 mb-1">
                  <span>Executing tests...</span>
                  <span>{liveTestProgress.testIndex} / {liveTestProgress.totalTests}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-sky-500 h-1.5 transition-all duration-300"
                    style={{ width: `${(liveTestProgress.testIndex / liveTestProgress.totalTests) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase text-right">
                  Last Test Verdict: {liveTestProgress.verdict.replace('_', ' ')}
                </p>
              </div>
            )}

            {submissionResult.exec_time_ms !== undefined && (
              <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-800 pt-3 text-xs font-mono text-slate-300">
                <div>Runtime: <span className="text-sky-400 font-bold">{submissionResult.exec_time_ms} ms</span></div>
                <div>Memory: <span className="text-violet-400 font-bold">{submissionResult.memory_used_mb?.toFixed(2)} MB</span></div>
                <div>Score: <span className="text-emerald-400 font-bold">{submissionResult.score} / 100</span></div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
    <BackToTop />
    </>
  );
}
