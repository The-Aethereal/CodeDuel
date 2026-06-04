import { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/Logo';
import { Card, CardBody } from './Card';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md animate-fade-in">{children}</div>
    </div>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('shadow-card overflow-hidden', className)}>
      <CardBody className="p-8">
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <Logo variant="auth" linkToHome={false} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

export function AuthFooter({ children, className }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-6 text-center text-sm text-slate-600', className)}>{children}</p>;
}
