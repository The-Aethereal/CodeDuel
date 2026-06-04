import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';

const LOGO_PATH = '/images/codeduel-logo.png';

/** Intrinsic dimensions of codeduel-logo.png (768×714). */
const LOGO_WIDTH = 768;
const LOGO_HEIGHT = 714;

type LogoVariant = 'navbar' | 'auth' | 'footer' | 'hero' | 'admin';

const variantConfig: Record<
  LogoVariant,
  { width: number; height: number; className: string; priority?: boolean }
> = {
  navbar: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    className: 'h-9 w-auto sm:h-10 shrink-0',
    priority: true,
  },
  auth: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    className: 'h-28 w-auto sm:h-32 max-w-[min(100%,280px)]',
  },
  footer: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    className: 'h-10 w-auto sm:h-11 opacity-95',
  },
  hero: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    className: 'h-36 w-auto sm:h-44 md:h-48 max-w-[min(100%,360px)]',
    priority: true,
  },
  admin: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
    className: 'h-9 w-auto max-w-[140px]',
  },
};

type LogoProps = {
  variant?: LogoVariant;
  className?: string;
  /** When true (default for navbar), wraps the image in a link to home. */
  linkToHome?: boolean;
};

export function Logo({ variant = 'navbar', className, linkToHome }: LogoProps) {
  const config = variantConfig[variant];
  const shouldLink = linkToHome ?? variant === 'navbar';

  const image = (
    <Image
      src={LOGO_PATH}
      alt="CodeDuel — Compete. Code. Conquer."
      width={config.width}
      height={config.height}
      className={cn(config.className, 'object-contain', className)}
      priority={config.priority}
    />
  );

  if (shouldLink) {
    return (
      <Link
        href="/"
        className="inline-flex shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        aria-label="CodeDuel home"
      >
        {image}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0 items-center">{image}</span>;
}

export { LOGO_PATH };
