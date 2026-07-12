'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';

/**
 * Horizontal drag handle between two panels.
 * Adjusts the right panel width by dragging.
 */
export function HorizontalHandle({
  onDrag,
}: {
  onDrag: (delta: number) => void;
}) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      onDrag(lastX.current - e.clientX);
      lastX.current = e.clientX;
    },
    [onDrag]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div
      className="w-1 flex-shrink-0 group relative cursor-col-resize z-10 hover:bg-brand/30 transition-colors"
      onMouseDown={(e) => {
        dragging.current = true;
        lastX.current = e.clientX;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      }}
    >
      {/* Visual indicator */}
      <div className="absolute inset-y-0 left-0 w-[1px] bg-surface-border group-hover:bg-brand/50 transition-colors" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-0.5 h-3 bg-brand/70 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Vertical drag handle between two stacked panels.
 */
export function VerticalHandle({
  onDrag,
}: {
  onDrag: (delta: number) => void;
}) {
  const dragging = useRef(false);
  const lastY = useRef(0);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current) return;
      onDrag(e.clientY - lastY.current);
      lastY.current = e.clientY;
    },
    [onDrag]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div
      className="h-1 flex-shrink-0 group relative cursor-row-resize z-10 hover:bg-brand/30 transition-colors"
      onMouseDown={(e) => {
        dragging.current = true;
        lastY.current = e.clientY;
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[1px] bg-surface-border group-hover:bg-brand/50 transition-colors" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-row gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-0.5 w-3 bg-brand/70 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Panel header with title, icon, and close button.
 */
export function PanelHeader({
  icon: Icon,
  title,
  onClose,
  children,
}: {
  icon: React.ElementType;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-surface-border bg-surface-2 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted" />
        <span className="text-xs font-medium text-slate-300">{title}</span>
      </div>
      <div className="flex items-center gap-1">
        {children}
        <button
          onClick={onClose}
          className="w-4 h-4 rounded-full flex items-center justify-center bg-surface-3 hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors text-[10px] font-bold"
          title="Close panel"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Pill buttons to re-open closed panels.
 */
export function ReopenBar({
  showPreview,
  showCode,
  onOpenPreview,
  onOpenCode,
}: {
  showPreview: boolean;
  showCode: boolean;
  onOpenPreview: () => void;
  onOpenCode: () => void;
}) {
  if (showPreview && showCode) return null;
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-20 pointer-events-none">
      {!showPreview && (
        <button
          onClick={onOpenPreview}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-border text-xs text-slate-300 hover:text-white hover:border-brand/40 transition-all shadow-lg"
        >
          <span className="text-brand">▶</span> Open 3D Preview
        </button>
      )}
      {!showCode && (
        <button
          onClick={onOpenCode}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface-border text-xs text-slate-300 hover:text-white hover:border-brand/40 transition-all shadow-lg"
        >
          <span className="text-brand">{'</>'}</span> Open Code View
        </button>
      )}
    </div>
  );
}
