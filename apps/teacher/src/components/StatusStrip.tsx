'use client';

import { useDemo } from '@/lib/demoStore';
import { Lock, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function StatusStrip() {
  const { state } = useDemo();
  const { demoPhase, buildTime, agentActivity, assumptionCount, lockCount } = state;

  const isBuilding = demoPhase === 'building';
  const isBuilt = demoPhase === 'built';

  return (
    <div className="flex items-center h-7 px-3 border-t border-surface bg-surface-1 flex-shrink-0 gap-4">
      {/* Build status */}
      <div className="flex items-center gap-2 min-w-0">
        {isBuilding && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-brand pulse-dot flex-shrink-0" />
            <div className="w-24 h-1 bg-surface rounded-full overflow-hidden">
              <div className="h-full bg-brand build-progress rounded-full" />
            </div>
          </>
        )}
        {isBuilt && buildTime && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-[11px] text-emerald-400 font-medium">built in {buildTime}</span>
          </>
        )}
        {!isBuilding && !isBuilt && (
          <span className="text-[11px] text-muted">
            {demoPhase === 'empty' && 'No project loaded'}
            {demoPhase === 'loading' && 'Reading deck…'}
            {demoPhase === 'loaded' && 'Deck ready'}
            {demoPhase === 'interviewing' && 'Gathering requirements'}
            {demoPhase === 'ready' && 'Ready to build'}
          </span>
        )}
      </div>

      {/* Agent activity */}
      {agentActivity && (
        <>
          <div className="w-px h-3 bg-surface flex-shrink-0" />
          <span className={clsx(
            'text-[11px] font-mono min-w-0 truncate flex-1',
            isBuilding ? 'text-brand' : 'text-muted'
          )}>
            {agentActivity}
          </span>
        </>
      )}

      <div className="flex-1" />

      {/* Assumptions + locks */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {assumptionCount > 0 && (
          <button className="flex items-center gap-1 text-[11px] text-yellow-500 hover:text-yellow-400 transition-colors">
            <AlertCircle className="w-3 h-3" />
            {assumptionCount} assumption{assumptionCount !== 1 && 's'}
          </button>
        )}
        {lockCount > 0 && (
          <button className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-300 transition-colors">
            <Lock className="w-3 h-3" />
            {lockCount} lock{lockCount !== 1 && 's'}
          </button>
        )}
        {assumptionCount === 0 && lockCount === 0 && (
          <span className="text-[11px] text-muted">ClassForge</span>
        )}
      </div>
    </div>
  );
}
