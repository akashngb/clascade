'use client';

import { useState } from 'react';
import { Upload, Link2, MessageSquare, BookOpen, Microscope, FlaskConical } from 'lucide-react';
import { useDemo } from '@/lib/demoStore';
import { DEMO_SLIDES, INTERVIEW_CARDS } from '@/lib/fixtures';
import type { IntentType } from '@/lib/types';
import clsx from 'clsx';

const INTENT_STYLES: Record<IntentType, { chip: string; bg: string }> = {
  definition: { chip: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', bg: 'from-indigo-900/40' },
  process: { chip: 'bg-teal-500/20 text-teal-300 border-teal-500/30', bg: 'from-teal-900/40' },
  comparison: { chip: 'bg-orange-500/20 text-orange-300 border-orange-500/30', bg: 'from-orange-900/40' },
  data: { chip: 'bg-violet-500/20 text-violet-300 border-violet-500/30', bg: 'from-violet-900/40' },
  narrative: { chip: 'bg-rose-500/20 text-rose-300 border-rose-500/30', bg: 'from-rose-900/40' },
};

const EXAMPLE_DECKS = [
  { id: 'photosynthesis', label: 'photosynthesis_deck', subtitle: '10 slides · Biology · Gr. 9', icon: Microscope, color: 'text-teal-400' },
  { id: 'ww1', label: 'ww1-sarajevo', subtitle: '8 slides · History · Gr. 7', icon: BookOpen, color: 'text-indigo-400' },
  { id: 'physics', label: 'projectile-motion', subtitle: '6 slides · Physics · Gr. 10', icon: FlaskConical, color: 'text-orange-400' },
];

function SkeletonSlide() {
  return (
    <div className="flex-shrink-0 w-36 h-24 rounded-lg bg-surface-3 border border-surface shimmer" />
  );
}

function SlideCard({ slide, index }: { slide: typeof DEMO_SLIDES[0]; index: number }) {
  const [intent, setIntent] = useState(slide.intent);
  const style = INTENT_STYLES[intent];

  const intents: IntentType[] = ['definition', 'process', 'comparison', 'data', 'narrative'];

  return (
    <div
      className={clsx(
        'flex-shrink-0 w-36 rounded-lg border border-surface overflow-hidden cursor-pointer group hover:border-brand/40 transition-all slide-up bg-gradient-to-br',
        style.bg,
        'to-surface-2'
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="h-20 flex items-center justify-center px-3 py-2">
        <p className="text-[11px] text-slate-300 text-center leading-tight font-medium line-clamp-3">
          {slide.title}
        </p>
      </div>
      <div className="px-2 pb-2 pt-1 border-t border-surface/60">
        <div className="relative group/intent">
          <button
            className={clsx(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full border w-full text-center transition-all',
              style.chip
            )}
            onClick={(e) => {
              e.stopPropagation();
              const nextIdx = (intents.indexOf(intent) + 1) % intents.length;
              setIntent(intents[nextIdx]);
            }}
            title="Click to change intent"
          >
            {intent}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SourcesTab() {
  const { state, dispatch } = useDemo();
  const [isDragging, setIsDragging] = useState(false);

  const isLoading = state.demoPhase === 'loading';
  const hasSlides = state.slides.length > 0;

  const selectDeck = (deckId: string) => {
    const isPhotosynthesis = deckId === 'photosynthesis';
    dispatch({ type: 'SET_DEMO_PHASE', phase: 'loading' });
    dispatch({ type: 'SET_PROJECT_NAME', name: isPhotosynthesis ? 'photosynthesis_deck' : deckId });
    dispatch({
      type: 'ADD_MESSAGE',
      message: {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Reading ${isPhotosynthesis ? 'photosynthesis_deck' : deckId}…`,
        timestamp: new Date(),
      },
    });

    setTimeout(() => {
      dispatch({ type: 'SET_SLIDES', slides: DEMO_SLIDES });
      dispatch({ type: 'SET_DEMO_PHASE', phase: 'loaded' });
      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: isPhotosynthesis
            ? "Deck read. 10 slides. Slides 4–7 look like a process — good fit for a build-the-chain level. Let me ask a few quick questions."
            : "Deck read. I've extracted the lesson beats. Let me ask a few questions to shape the game.",
          timestamp: new Date(),
        },
      });
      setTimeout(() => {
        dispatch({ type: 'SET_CURRENT_CARD', idx: 0 });
        dispatch({ type: 'SET_DEMO_PHASE', phase: 'interviewing' });
      }, 500);
    }, 1600);
  };

  // Empty state
  if (!hasSlides && !isLoading) {
    return (
      <div
        className={clsx(
          'h-full flex flex-col items-center justify-center gap-8 px-8 transition-all',
          isDragging && 'bg-brand/5 border-brand/30'
        )}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setIsDragging(false);
          selectDeck('uploaded_deck');
        }}
      >
        {/* Drop target */}
        <div className="w-full max-w-sm">
          <div className={clsx(
            'border-2 border-dashed rounded-2xl p-10 text-center transition-all',
            isDragging ? 'border-brand bg-brand/5' : 'border-surface'
          )}>
            <Upload className="w-8 h-8 text-muted mx-auto mb-3" />
            <p className="text-[14px] font-medium text-slate-300 mb-1">Drop your deck here</p>
            <p className="text-[12px] text-muted mb-5">PDF, PPTX, or images</p>
            <div className="flex items-center justify-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface text-[12px] text-slate-300 hover:border-brand/40 hover:text-white transition-all">
                <Upload className="w-3.5 h-3.5 text-brand" /> Upload
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface text-[12px] text-slate-300 hover:border-brand/40 hover:text-white transition-all">
                <Link2 className="w-3.5 h-3.5 text-brand" /> Paste link
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-surface text-[12px] text-slate-300 hover:border-brand/40 hover:text-white transition-all">
                <MessageSquare className="w-3.5 h-3.5 text-brand" /> Just talk
              </button>
            </div>
          </div>
        </div>

        {/* Example decks */}
        <div className="w-full max-w-sm">
          <p className="text-[11px] text-muted text-center mb-3 uppercase tracking-wider">Example decks</p>
          <div className="space-y-1.5">
            {EXAMPLE_DECKS.map(deck => {
              const Icon = deck.icon;
              return (
                <button
                  key={deck.id}
                  onClick={() => selectDeck(deck.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-2 border border-surface hover:border-brand/40 hover:bg-surface-3 transition-all text-left group"
                >
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', deck.color)} />
                  <div>
                    <p className="text-[13px] font-medium text-slate-200 group-hover:text-white">{deck.label}</p>
                    <p className="text-[11px] text-muted">{deck.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col p-6 gap-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-28 h-4 rounded bg-surface-3 shimmer" />
          <div className="w-16 h-4 rounded bg-surface-3 shimmer" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonSlide key={i} />
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-brand pulse-dot" />
          <span className="text-[12px] text-muted">Reading deck…</span>
        </div>
      </div>
    );
  }

  // Loaded: filmstrip
  return (
    <div className="h-full flex flex-col p-5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-[14px] font-semibold text-white">{state.projectName}</h2>
          <p className="text-[11px] text-muted">{state.slides.length} slides · intent chips are editable</p>
        </div>
      </div>

      {/* Filmstrip — scrollable */}
      <div className="flex gap-3 overflow-x-auto pb-3 flex-1">
        {state.slides.map((slide, i) => (
          <SlideCard key={slide.id} slide={slide} index={i} />
        ))}
      </div>

      {/* Intent legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap flex-shrink-0">
        <span className="text-[11px] text-muted">Intent:</span>
        {(Object.keys(INTENT_STYLES) as IntentType[]).map(intent => (
          <span
            key={intent}
            className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full border',
              INTENT_STYLES[intent].chip
            )}
          >
            {intent}
          </span>
        ))}
        <span className="text-[11px] text-muted">· click any chip to change</span>
      </div>
    </div>
  );
}
