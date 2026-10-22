import { cn } from '@/lib/utils';
import { getPortalTierDisplayLabel } from '@/lib/env/portal-tier';

type PortalEnvironmentBadgeProps = {
  className?: string;
};

/** Non-production tier label (sidebar under Fleet Pulse, login header). */
export function PortalEnvironmentBadge({
  className,
}: PortalEnvironmentBadgeProps) {
  const label = getPortalTierDisplayLabel();
  if (!label) {
    return null;
  }
  return (
    <p
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wider text-slate-500',
        className,
      )}
    >
      {label}
    </p>
  );
}
