import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-800 opacity-95" />
        <div className="relative page-container py-20 sm:py-28">
          <div className="max-w-3xl animate-fade-in">
            <div className="mb-8">
              <Logo variant="hero" linkToHome={false} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400 mb-4">
              Compete. Code. Conquer.
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white text-balance">
              Learn faster and compete smarter
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-300 max-w-2xl">
              Solve curated problems, enter real-time duels, and track your growth with rich submission analytics.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
              <Link
                href="/problems"
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-400 transition-colors duration-150"
              >
                Explore Problems
              </Link>
              <Link
                href="/duels"
                className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-white/5 px-8 py-3 text-base font-semibold text-white hover:bg-white/10 transition-colors duration-150"
              >
                Start a Duel
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-600 bg-white/5 px-8 py-3 text-base font-semibold text-white hover:bg-white/10 transition-colors duration-150"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl border border-slate-500/60 px-8 py-3 text-base font-semibold text-slate-200 hover:bg-white/5 transition-colors duration-150"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="page-container">
          <div className="text-center mb-12 sm:mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">Features</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 text-balance">
              A polished experience for every competitor.
            </h2>
            <p className="mt-4 text-base text-slate-600 max-w-2xl mx-auto">
              From problem solving to duel mode, CodeDuel is designed to keep your workflow fast, clear, and rewarding.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Practice Problems',
                desc: 'Browse curated algorithm challenges with clear difficulty, fast filtering, and smart feedback.',
              },
              {
                title: 'Real-Time Duels',
                desc: 'Create or join a duel room instantly and compete head-to-head with live results.',
              },
              {
                title: 'Progress Tracking',
                desc: 'View your profile performance, activity map, and submission trends in one place.',
              },
            ].map((feature) => (
              <Link
                key={feature.title}
                href={feature.title === 'Practice Problems' ? '/problems' : feature.title === 'Real-Time Duels' ? '/duels' : '/login'}
                className="rounded-card-lg bg-white p-8 border border-slate-200/80 shadow-soft hover:shadow-card transition-shadow duration-200 block"
              >
                <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{feature.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
