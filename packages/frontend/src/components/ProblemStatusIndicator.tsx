export type ProblemUserStatus = 'solved' | 'attempted' | 'unsolved';

const statusConfig: Record<ProblemUserStatus, { icon: string; label: string; title: string }> = {
  solved: { icon: '✅', label: 'Solved', title: 'Solved' },
  attempted: { icon: '🟡', label: 'Attempted', title: 'Attempted' },
  unsolved: { icon: '⚪', label: 'Not tried', title: 'Not tried' },
};

export function ProblemStatusIndicator({
  status,
  showLabel = false,
  className,
}: {
  status: ProblemUserStatus;
  showLabel?: boolean;
  className?: string;
}) {
  const config = statusConfig[status] ?? statusConfig.unsolved;

  return (
    <span
      className={className}
      title={config.title}
      aria-label={config.title}
      role="img"
    >
      <span className="text-base leading-none" aria-hidden>
        {config.icon}
      </span>
      {showLabel && (
        <span className="sr-only">{config.label}</span>
      )}
    </span>
  );
}

export function getProblemStatusLabel(status: ProblemUserStatus): string {
  return statusConfig[status]?.label ?? 'Not tried';
}
