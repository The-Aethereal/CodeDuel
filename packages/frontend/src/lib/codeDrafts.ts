const DRAFT_PREFIX = 'codeduel-draft';

function draftKey(problemSlug: string, language: string): string {
  return `${DRAFT_PREFIX}:${problemSlug}:${language}`;
}

export function saveCodeDraft(problemSlug: string, language: string, code: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!code.trim()) {
      localStorage.removeItem(draftKey(problemSlug, language));
      return;
    }
    localStorage.setItem(draftKey(problemSlug, language), code);
  } catch {
    // Ignore quota errors
  }
}

export function loadCodeDraft(problemSlug: string, language: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(draftKey(problemSlug, language));
  } catch {
    return null;
  }
}

export function clearCodeDraft(problemSlug: string, language: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(draftKey(problemSlug, language));
  } catch {
    // Ignore
  }
}
