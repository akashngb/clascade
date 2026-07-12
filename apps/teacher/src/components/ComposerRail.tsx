'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Mic, Paperclip, Bot, User, ChevronLeft, ChevronRight, SkipForward,
} from 'lucide-react';
import { useDemo } from '@/lib/demoStore';
import { DEMO_SLIDES } from '@/lib/fixtures';
import type { InterviewCardDef, Message } from '@/lib/types';
import clsx from 'clsx';

/* ──────────────── Interview Card ──────────────── */
function InterviewCard({
  card,
  onAnswer,
  onSkip,
}: {
  card: InterviewCardDef;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}) {
  return (
    <div className="card-slide-in mx-1 mb-2 rounded-xl border border-surface bg-surface-2 p-3">
      <p className="text-[13px] font-semibold text-white mb-2.5">{card.question}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {card.chips.map(chip => (
          <button
            key={chip}
            onClick={() => onAnswer(chip)}
            className="px-3 py-1 rounded-full text-[12px] font-medium border border-surface-border text-slate-300 hover:border-brand hover:text-brand hover:bg-brand-soft transition-all"
          >
            {chip}
          </button>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="flex items-center gap-1 text-[11px] text-muted hover:text-slate-400 transition-colors"
      >
        <SkipForward className="w-3 h-3" />
        Skip
      </button>
    </div>
  );
}

/* ──────────────── Message bubble ──────────────── */
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={clsx('flex gap-2 slide-up', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5',
        isUser ? 'bg-gradient-to-br from-indigo-400 to-violet-500' : 'bg-surface-3 border border-surface'
      )}>
        {isUser ? <User className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-brand" />}
      </div>
      <div className={clsx('max-w-[82%]', isUser && 'items-end flex flex-col')}>
        <div className={clsx(
          'rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
          isUser
            ? 'bg-brand text-white rounded-tr-sm'
            : 'bg-surface-2 border border-surface text-slate-200 rounded-tl-sm'
        )}>
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
        <span className="text-[10px] text-muted mt-0.5 px-1" suppressHydrationWarning>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

/* ──────────────── Typing indicator ──────────────── */
function TypingIndicator() {
  return (
    <div className="flex gap-2 slide-up">
      <div className="w-6 h-6 rounded-full flex-shrink-0 bg-surface-3 border border-surface flex items-center justify-center">
        <Bot className="w-3.5 h-3.5 text-brand" />
      </div>
      <div className="bg-surface-2 border border-surface rounded-2xl rounded-tl-sm px-3 py-2.5">
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand/50"
              style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────── Collapsed icon strip ──────────────── */
function IconStrip({ onExpand }: { onExpand: () => void }) {
  const { dispatch } = useDemo();
  return (
    <div className="flex flex-col items-center py-3 gap-3 w-12 border-r border-surface bg-surface-1 h-full">
      <button
        onClick={onExpand}
        className="p-2 rounded-lg hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors"
        title="Expand Composer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <div className="w-5 h-px bg-surface" />
      <button className="p-2 rounded-lg text-muted hover:text-slate-300 hover:bg-surface-3 transition-colors" title="Chat">
        <Bot className="w-4 h-4" />
      </button>
      <button className="p-2 rounded-lg text-muted hover:text-slate-300 hover:bg-surface-3 transition-colors" title="Voice">
        <Mic className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ──────────────── Main ComposerRail ──────────────── */
export default function ComposerRail() {
  const { state, dispatch } = useDemo();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, cards, currentCardIdx, demoPhase, composerCollapsed } = state;
  const activeCard = currentCardIdx >= 0 && currentCardIdx < cards.length ? cards[currentCardIdx] : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, activeCard]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    dispatch({
      type: 'ADD_MESSAGE',
      message: { id: crypto.randomUUID(), role, content, timestamp: new Date() },
    });
  }, [dispatch]);

  const handleCardAnswer = useCallback((cardId: string, answer: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Mark answered
    dispatch({ type: 'ANSWER_CARD', cardId, answer });
    dispatch({ type: 'SET_CURRENT_CARD', idx: -1 });

    // User message
    addMessage('user', answer);

    // Show typing
    setIsTyping(true);

    // Reveal nodes with shimmer
    card.nodesToReveal.forEach(nodeId => {
      dispatch({ type: 'REVEAL_NODE', nodeId });
    });

    // Update status
    const answered = Object.keys(state.answeredCards).length + 1;
    dispatch({ type: 'SET_ASSUMPTION_COUNT', count: Math.max(0, 3 - answered) });
    dispatch({ type: 'SET_LOCK_COUNT', count: answered });

    // After delay: resolve nodes + assistant reply
    setTimeout(() => {
      card.nodesToReveal.forEach(nodeId => {
        const node = state.flowNodes.find(n => n.id === nodeId);
        dispatch({ type: 'SET_NODE_STATUS', nodeId, status: node?.finalStatus ?? 'built' });
      });
      setIsTyping(false);
      addMessage('assistant', card.assistantReply);

      // Show next card
      const currentIdx = cards.findIndex(c => c.id === cardId);
      const nextIdx = currentIdx + 1;
      if (nextIdx < cards.length) {
        setTimeout(() => {
          dispatch({ type: 'SET_CURRENT_CARD', idx: nextIdx });
          dispatch({ type: 'SET_DEMO_PHASE', phase: 'interviewing' });
        }, 300);
      } else {
        dispatch({ type: 'SET_DEMO_PHASE', phase: 'ready' });
        dispatch({ type: 'SET_ASSUMPTION_COUNT', count: 2 });
        dispatch({ type: 'SET_LOCK_COUNT', count: 1 });
      }
    }, 900);
  }, [cards, state.answeredCards, state.flowNodes, dispatch, addMessage]);

  const handleSkip = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_CARD', idx: currentCardIdx + 1 });
    dispatch({ type: 'SET_ASSUMPTION_COUNT', count: state.assumptionCount + 1 });
    addMessage('assistant', "Skipped — I'll pick a reasonable default and flag it as an assumption.");
  }, [currentCardIdx, state.assumptionCount, dispatch, addMessage]);

  const handleSend = () => {
    if (!input.trim()) return;
    addMessage('user', input.trim());
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage('assistant', `Got it — making that change to "${input.trim()}". The affected nodes are being updated in the flow.`);
    }, 1100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (composerCollapsed) {
    return <IconStrip onExpand={() => dispatch({ type: 'TOGGLE_COMPOSER' })} />;
  }

  return (
    <div className="flex flex-col h-full bg-surface-1 border-r border-surface overflow-hidden" style={{ width: state.composerWidth }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-surface flex-shrink-0">
        <span className="text-[12px] font-semibold text-subtle uppercase tracking-wider">Composer</span>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_COMPOSER' })}
          className="p-1 rounded hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors"
          title="Collapse composer (Cmd+\)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Active interview card */}
      {activeCard && !isTyping && (
        <InterviewCard
          card={activeCard}
          onAnswer={ans => handleCardAnswer(activeCard.id, ans)}
          onSkip={handleSkip}
        />
      )}

      {/* Input */}
      <div className="border-t border-surface px-2 py-2 flex-shrink-0">
        <div className="flex items-end gap-1.5 bg-surface-2 border border-surface rounded-xl px-2.5 py-2 focus-within:border-brand/40 transition-colors">
          <button className="flex-shrink-0 p-1 rounded text-muted hover:text-slate-300 hover:bg-surface-3 transition-colors mb-0.5">
            <Paperclip className="w-3.5 h-3.5" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={demoPhase === 'empty' ? 'Pick an example deck →' : 'Refine the lesson…'}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-[13px] text-slate-200 placeholder:text-muted leading-relaxed py-0.5 max-h-[120px]"
          />
          <div className="flex items-center gap-1 mb-0.5">
            <button className="p-1 rounded text-muted hover:text-slate-300 hover:bg-surface-3 transition-colors">
              <Mic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={clsx(
                'p-1 rounded transition-colors',
                input.trim() ? 'text-white bg-brand hover:bg-brand-muted' : 'text-muted'
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
