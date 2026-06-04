'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/lib/ThemeContext';
import { cn } from '@/lib/cn';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

interface Tag {
  id: string;
  name: string;
}

export default function CreateProblemPage() {
  const { token, user, isLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { resolvedTheme } = useTheme();

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    difficulty: 'easy',
    time_limit_ms: 2000,
    memory_limit_mb: 256,
    is_published: false,
  });
  const [description, setDescription] = useState<string | undefined>('**Problem Description...**\n\n### Input\n\n### Output\n\n### Constraints');

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/problems');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    fetch('http://localhost:4000/api/tags')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAvailableTags(data);
      })
      .catch(err => console.error('Failed to fetch tags', err));
  }, []);

  const handleToggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateInlineTag = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || !token) return;

    try {
      const res = await fetch('http://localhost:4000/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newTagInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create tag');

      setAvailableTags(prev => [...prev, data]);
      setSelectedTags(prev => [...prev, data.id]);
      setNewTagInput('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          description,
          tagIds: selectedTags
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create problem');
      }

      const newProblem = await res.json();
      toast.success('Problem created successfully!');
      router.push(`/admin/problems/${newProblem.problem.id}/testcases`);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl" data-color-mode={resolvedTheme}>
      <div className="mb-6">
        <Link href="/admin/problems" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200">
          ← Back to problems
        </Link>
      </div>

      <PageHeader title="Create New Problem" />

      {error && <Alert className="mb-6">{error}</Alert>}

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Title</Label>
                <Input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Two Sum"
                />
              </div>
              <div>
                <Label>URL Slug</Label>
                <Input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="two-sum"
                />
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </div>
              <div className="flex flex-col justify-center md:mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={e => setFormData({ ...formData, is_published: e.target.checked })}
                    className="h-4 w-4 text-sky-600 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Publish immediately?</span>
                </label>
              </div>
              <div>
                <Label>Time Limit (ms)</Label>
                <Input
                  type="number"
                  required
                  value={formData.time_limit_ms}
                  onChange={e => setFormData({ ...formData, time_limit_ms: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Memory Limit (MB)</Label>
                <Input
                  type="number"
                  required
                  value={formData.memory_limit_mb}
                  onChange={e => setFormData({ ...formData, memory_limit_mb: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="border-t border-b border-slate-100 dark:border-slate-800 py-6">
              <Label>Problem Tags</Label>
              <div className="flex flex-wrap gap-2 mb-4 mt-2">
                {availableTags.length === 0 ? (
                  <span className="text-sm text-slate-500 dark:text-slate-400 italic">No tags available yet. Create one below!</span>
                ) : (
                  availableTags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={cn(
                        'px-3 py-1 text-xs font-semibold rounded-full border transition-colors duration-200',
                        selectedTags.includes(tag.id)
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                      )}
                    >
                      {tag.name}
                    </button>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  placeholder="e.g. dynamic programming"
                  className="max-w-xs"
                />
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={handleCreateInlineTag}
                  disabled={!newTagInput.trim()}
                >
                  Add Tag
                </Button>
              </div>
            </div>

            <div>
              <Label>Description (Markdown Supported)</Label>
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <MDEditor
                  value={description}
                  onChange={setDescription}
                  height={400}
                  previewOptions={{ className: 'prose max-w-none text-sm' }}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save & Proceed to Test Cases'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
