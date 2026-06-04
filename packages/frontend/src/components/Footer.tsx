'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { Logo } from '@/components/Logo';

const footerLinks = [
  { href: '/', label: 'Home' },
  { href: '/problems', label: 'Problems' },
  { href: '/duels', label: 'Duels' },
  { href: '/login', label: 'Log In' },
  { href: '/signup', label: 'Sign Up' },
];

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm py-8 transition-colors duration-200">
      <div className="page-container py-0">
        <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-4">
          {footerLinks
            .filter((link) => !user || (link.href !== '/login' && link.href !== '/signup'))
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-400 transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          {user && (
            <>
              <Link
                href={`/profile/${user.username}`}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-400 transition-colors duration-200"
              >
                Profile
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin/problems" className="text-sm text-slate-600 hover:text-sky-700 transition-colors">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>
        <div className="flex flex-col items-center gap-3 mb-4">
          <Logo variant="footer" linkToHome={false} />
        </div>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          CodeDuel © {new Date().getFullYear()}. Crafted for clean contest flow.
        </p>
      </div>
    </footer>
  );
}
