'use client';

import { cn } from '@/utils/Helpers';

export function StrixBadge({ className, pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300',
      className,
    )}
    >
      <span className={cn('inline-block size-1.5 rounded-full bg-emerald-400', pulse && 'animate-pulse')} />
      <span>Strix governed</span>
    </span>
  );
}

export function RiskPill({ level }: { level: string }) {
  const map: Record<string, string> = {
    low: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
    moderate: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    high: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
    critical: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
  };
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
      map[level] ?? map.low,
    )}
    >
      {level}
    </span>
  );
}

export function DecisionPill({ decision }: { decision: string }) {
  const map: Record<string, string> = {
    allow: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    approval_required: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    block: 'bg-rose-500/15 text-rose-300 border-rose-400/40',
  };
  const label = decision === 'approval_required' ? 'Approval required' : decision;
  return (
    <span className={cn(
      'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
      map[decision] ?? map.allow,
    )}
    >
      {label}
    </span>
  );
}
