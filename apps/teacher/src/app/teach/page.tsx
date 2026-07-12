'use client';

import { useCallback, useEffect } from 'react';
import { DemoProvider, useDemo } from '@/lib/demoStore';
import TopBar from '@/components/TopBar';
import ComposerRail from '@/components/ComposerRail';
import PlayPanel from '@/components/PlayPanel';
import StatusStrip from '@/components/StatusStrip';
import SourcesTab from '@/components/tabs/SourcesTab';
import FlowTab from '@/components/tabs/FlowTab';
import SpecTab from '@/components/tabs/SpecTab';
import CodeTab from '@/components/tabs/CodeTab';
import { HorizontalHandle } from '@/components/ResizablePanels';

/* ──────────────── Center canvas ──────────────── */
function CenterCanvas() {
  const { state } = useDemo();
  const tab = state.activeTab;

  return (
    <div className="flex-1 min-w-0 overflow-hidden bg-surface">
      {tab === 'sources' && <SourcesTab />}
      {tab === 'flow' && <FlowTab />}
      {tab === 'spec' && <SpecTab />}
      {tab === 'code' && <CodeTab />}
    </div>
  );
}

/* ──────────────── Inner layout (inside DemoProvider) ──────────────── */
function Layout() {
  const { state, dispatch } = useDemo();

  // Keyboard shortcuts for layout presets
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '\\') dispatch({ type: 'TOGGLE_COMPOSER' });
      }
      if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === '1') dispatch({ type: 'SET_LAYOUT', preset: 'build' });
        if (e.key === '2') dispatch({ type: 'SET_LAYOUT', preset: 'design' });
        if (e.key === '4') dispatch({ type: 'SET_LAYOUT', preset: 'present' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  const isPresent = state.layoutPreset === 'present';

  const handleComposerResize = useCallback((delta: number) => {
    dispatch({
      type: 'SET_COMPOSER_WIDTH',
      width: Math.min(560, Math.max(320, state.composerWidth + delta)),
    });
  }, [dispatch, state.composerWidth]);

  const handlePlayResize = useCallback((delta: number) => {
    dispatch({
      type: 'SET_PLAY_WIDTH',
      width: Math.min(700, Math.max(320, state.playWidth - delta)),
    });
  }, [dispatch, state.playWidth]);

  if (isPresent) {
    return (
      <div className="h-full flex flex-col bg-surface">
        <div className="flex-1 overflow-hidden">
          <PlayPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Composer rail */}
        {!state.composerCollapsed ? (
          <>
            <ComposerRail />
            <HorizontalHandle onDrag={handleComposerResize} />
          </>
        ) : (
          <ComposerRail />
        )}

        {/* Center canvas */}
        <CenterCanvas />

        {/* Right: Play panel */}
        <HorizontalHandle onDrag={handlePlayResize} />
        <PlayPanel />
      </div>

      <StatusStrip />
    </div>
  );
}

/* ──────────────── Page root ──────────────── */
export default function TeachPage() {
  return (
    <DemoProvider>
      <Layout />
    </DemoProvider>
  );
}
