'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/Logo';

const adminNavItems = [
  { href: '/admin/problems', label: 'Manage Problems' },
  { href: '/admin/problems/new', label: 'Create Problem' },
  { href: '/admin/testcases', label: 'Manage Test Cases' },
  { href: '/admin/testcases/new', label: 'Create Test Cases' },
];

function isAdminNavActive(pathname: string, href: string) {
  if (href === '/admin/testcases') {
    return pathname === '/admin/testcases' || /\/admin\/problems\/[^/]+\/testcases/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="space-y-1">
      <div className="px-2 pb-3 pt-1 border-b border-slate-200/80 dark:border-slate-700/80 mb-2">
        <Logo variant="admin" linkToHome />
      </div>
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Admin</p>
      {adminNavItems.map((item) => {
        const active = isAdminNavActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200',
              active
                ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            )}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
