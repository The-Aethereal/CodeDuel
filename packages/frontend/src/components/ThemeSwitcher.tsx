'use client';

import { useTheme, ThemePreference } from '@/lib/ThemeContext';
import { cn } from '@/lib/cn';

const options: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export default function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const current = options.find((o) => o.value === theme) ?? options[2];
    const nextIndex = (options.findIndex((o) => o.value === theme) + 1) % options.length;
    return (
      <button
        type="button"
        onClick={() => setTheme(options[nextIndex].value)}
        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors duration-200"
        aria-label={`Theme: ${current.label}. Click to switch.`}
        title={`Theme: ${current.label}`}
      >
        <span className="text-base leading-none">{current.icon}</span>
      </button>
    );
  }

  return (
    <div
      className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-0.5 gap-0.5"
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200',
            theme === option.value
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          )}
        >
          <span aria-hidden>{option.icon}</span>
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
