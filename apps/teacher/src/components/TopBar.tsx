'use client';

import { useDemo } from '@/lib/demoStore';
import { Zap, RefreshCw, Layers, Play, FileJson, Code2, Image } from 'lucide-react';
import type { TabId, LayoutPreset } from '@/lib/types';
import clsx from 'clsx';

const STAGES: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'sources', label: 'Sources', icon: Image },
  { id: 'flow', label: 'Flow', icon: Layers },
  { id: 'spec', label: 'Spec', icon: FileJson },
  { id: 'code', label: 'Code', icon: Code2 },
];

const PRESETS: { id: LayoutPreset; label: string; key: string }[] = [
  { id: 'build', label: 'Build', key: '1' },
  { id: 'design', label: 'Design', key: '2' },
  { id: 'present', label: 'Present', key: '4' },
];

function stageStatus(tab: TabId, demoPhase: string, answeredCards: Record<string, string>) {
  if (tab === 'sources') return demoPhase !== 'empty' ? 'done' : 'empty';
  if (tab === 'flow') {
    const answered = Object.keys(answeredCards).length;
    if (answered === 0) return 'empty';
    if (answered < 3) return 'active';
    return 'done';
  }
  if (tab === 'spec') return demoPhase === 'built' || demoPhase === 'ready' ? 'done' : 'empty';
  if (tab === 'code') return demoPhase === 'built' ? 'done' : 'empty';
  return 'empty';
}

export default function TopBar() {
  const { state, dispatch } = useDemo();

  const handleTabClick = (tab: TabId) => {
    dispatch({ type: 'SET_TAB', tab });
    if (tab === 'flow') dispatch({ type: 'CLEAR_FLOW_NEW' });
  };

  const handlePreset = (preset: LayoutPreset) => {
    dispatch({ type: 'SET_LAYOUT', preset });
    if (preset === 'design') {
      dispatch({ type: 'SET_TAB', tab: 'flow' });
    } else if (preset === 'build') {
      dispatch({ type: 'SET_TAB', tab: 'code' });
    }
  };

  const handleRebuild = () => {
    if (state.demoPhase === 'empty' || state.demoPhase === 'loading') return;
    dispatch({ type: 'SET_DEMO_PHASE', phase: 'building' });
    dispatch({ type: 'SET_AGENT_ACTIVITY', activity: 'writing chain.ts' });
    dispatch({ type: 'SET_BUILD_TIME', time: null });

    const activities = ['writing chain.ts', 'filling spec slots', 'linking scene graph', 'compiling assets'];
    let i = 0;
    const activityTimer = setInterval(() => {
      i++;
      dispatch({ type: 'SET_AGENT_ACTIVITY', activity: activities[i % activities.length] });
    }, 700);

    setTimeout(() => {
      clearInterval(activityTimer);
      dispatch({ type: 'SET_DEMO_PHASE', phase: 'built' });
      dispatch({ type: 'SET_BUILD_TIME', time: '4.2s' });
      dispatch({ type: 'SET_AGENT_ACTIVITY', activity: '' });
      dispatch({ type: 'ADD_VERSION', version: `v${state.versions.length + 1}` });
    }, 2800);
  };

  const isBuilding = state.demoPhase === 'building';
  const canBuild = state.demoPhase === 'ready' || state.demoPhase === 'built' || state.demoPhase === 'loaded';

  return (
    <header className="flex items-center h-11 px-3 border-b border-surface bg-surface-1 flex-shrink-0 gap-3">
      {/* Logo + project name */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 rounded-md bg-brand flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-[13px] font-semibold text-white max-w-[140px] truncate">
          {state.projectName === 'New Project' ? (
            <span className="text-muted italic">New Project</span>
          ) : (
            state.projectName
          )}
        </span>
      </div>

      <div className="w-px h-5 bg-surface flex-shrink-0" />

      {/* Stage stepper */}
      <nav className="flex items-center gap-0.5 flex-1">
        {STAGES.map((stage, i) => {
          const status = stageStatus(stage.id, state.demoPhase, state.answeredCards);
          const isActive = state.activeTab === stage.id;
          const hasNew = stage.id === 'flow' && state.flowHasNew && !isActive;

          return (
            <div key={stage.id} className="flex items-center">
              <button
                onClick={() => handleTabClick(stage.id)}
                className={clsx(
                  'relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
                  isActive
                    ? 'bg-surface-3 text-white'
                    : 'text-subtle hover:text-slate-300 hover:bg-surface-2'
                )}
              >
                {/* Status indicator */}
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors',
                    status === 'done' && 'bg-emerald-400',
                    status === 'active' && 'bg-brand pulse-dot',
                    status === 'empty' && 'bg-surface-3 border border-surface'
                  )}
                />
                {stage.label}
                {hasNew && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand pulse-dot" />
                )}
              </button>
              {i < STAGES.length - 1 && (
                <span className="text-surface text-xs mx-0.5">›</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Layout presets */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => handlePreset(p.id)}
            title={`Layout: ${p.label} (${p.key})`}
            className={clsx(
              'px-2.5 py-1 rounded text-[11px] font-medium transition-all',
              state.layoutPreset === p.id
                ? 'bg-surface-3 text-white'
                : 'text-subtle hover:text-slate-300 hover:bg-surface-2'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Rebuild */}
      <button
        onClick={handleRebuild}
        disabled={!canBuild || isBuilding}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all flex-shrink-0',
          canBuild && !isBuilding
            ? 'bg-brand text-white hover:bg-brand-muted'
            : 'bg-surface-3 text-muted cursor-not-allowed'
        )}
      >
        <RefreshCw className={clsx('w-3.5 h-3.5', isBuilding && 'animate-spin')} />
        {isBuilding ? 'Building…' : 'Rebuild'}
      </button>
    </header>
  );
}
