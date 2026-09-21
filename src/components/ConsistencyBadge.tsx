import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle } from 'lucide-react';

interface ConsistencyBadgeProps {
  status: 'passed' | 'has_conflicts' | 'has_warnings' | 'not_checked' | string;
  size?: 'sm' | 'md';
}

export const ConsistencyBadge: React.FC<ConsistencyBadgeProps> = ({ status, size = 'md' }) => {
  if (status === 'passed') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        Канон соблюдён
      </span>
    );
  }

  if (status === 'has_conflicts') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <ShieldAlert className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        Конфликт канона
      </span>
    );
  }

  if (status === 'has_warnings') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        Есть нюансы
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full bg-stone-800 text-stone-400 border border-stone-700 ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <HelpCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      Не проверено
    </span>
  );
};
