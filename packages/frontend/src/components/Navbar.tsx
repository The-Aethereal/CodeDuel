'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { Logo } from '@/components/Logo';

const mainNavItems = [
  { href: '/problems', label: 'Problems' },
  { href: '/duels', label: 'Duels' },
];

const adminNavItems = [
  { href: '/admin/problems', label: 'Manage Problems' },
  { href: '/admin/problems/new', label: 'Create Problem' },
  { href: '/admin/testcases', label: 'Manage Test Cases' },
  { href: '/admin/testcases/new', label: 'Create Test Cases' },
];

export default function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
    setMenuOpen(false);
  };

  const navLinkClass = (href: string) =>
    cn(
      'text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-200',
      pathname === href || pathname.startsWith(`${href}/`)
        ? 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/50'
        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
    );

  const adminLinkClass = (href: string) => {
    const active =
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      (href === '/admin/testcases' && /\/admin\/problems\/[^/]+\/testcases/.test(pathname));
    return cn(
      'block px-4 py-2.5 text-sm transition-colors duration-200',
      active ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
    );
  };

  const renderAdminLinks = (onNavigate?: () => void) =>
    adminNavItems.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={adminLinkClass(item.href)}
        onClick={onNavigate}
        role="menuitem"
      >
        {item.label}
      </Link>
    ));

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-soft transition-colors duration-200">
      <div className="page-container py-0">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Logo variant="navbar" />
            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800">
              Build & Compete
            </span>
          </div>

          <div className="hidden md:flex items-center gap-0.5">
            {mainNavItems.map((item) => (
              <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                {item.label}
              </Link>
            ))}
            {user && (
              <Link href={`/profile/${user.username}`} className={navLinkClass(`/profile/${user.username}`)}>
                Profile
              </Link>
            )}
            {isAdmin && (
              <div className="relative" ref={adminMenuRef}>
                <button
                  type="button"
                  className={cn(
                    'text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-150 inline-flex items-center gap-1',
                    isAdminRoute
                      ? 'text-violet-700 bg-violet-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                  aria-expanded={adminOpen}
                  aria-haspopup="menu"
                  onClick={() => setAdminOpen((prev) => !prev)}
                >
                  Admin
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {adminOpen && (
                  <div
                    className="absolute right-0 mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-card-lg animate-fade-in transition-all duration-200"
                    role="menu"
                  >
                    {renderAdminLinks(() => setAdminOpen(false))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher compact />
            {!isLoading &&
              (user ? (
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Hi, <span className="font-semibold text-slate-900 dark:text-white">{user.username}</span>
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Log Out
                  </Button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link href="/login" className={navLinkClass('/login')}>
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors duration-150"
                  >
                    Sign Up
                  </Link>
                </div>
              ))}

            <button
              type="button"
              className="inline-flex md:hidden items-center justify-center rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-fade-in">
          <div className="page-container py-3 space-y-1">
            <div className="px-3 pb-2">
              <ThemeSwitcher />
            </div>
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn('block rounded-lg px-3 py-2.5 text-base font-medium', navLinkClass(item.href))}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <Link
                href={`/profile/${user.username}`}
                className={cn(
                  'block rounded-lg px-3 py-2.5 text-base font-medium',
                  navLinkClass(`/profile/${user.username}`)
                )}
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
            )}
            {isAdmin && (
              <div className="pt-2 mt-2 border-t border-slate-100">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Admin</p>
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'block rounded-lg px-3 py-2.5 text-base font-medium',
                      adminLinkClass(item.href)
                    )}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            {!isLoading &&
              (user ? (
                <button
                  onClick={handleLogout}
                  className="w-full text-left rounded-lg px-3 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
                >
                  Log Out
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block rounded-lg px-3 py-2.5 text-base font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    className="block rounded-lg px-3 py-2.5 text-base font-semibold text-sky-700 hover:bg-sky-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              ))}
          </div>
        </div>
      )}
    </nav>
  );
}
