'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { FileJson, Code2, Copy, Check, Download, Lock } from 'lucide-react';
import { SARAJEVO_SPEC } from '@/lib/fixtures';
import clsx from 'clsx';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-surface">
      <Code2 className="w-5 h-5 text-brand animate-pulse" />
    </div>
  ),
});

type View = 'structured' | 'raw';

const specJson = JSON.stringify(SARAJEVO_SPEC, null, 2);

function StructuredView() {
  const phases = SARAJEVO_SPEC.phases;
  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {/* Top-level fields */}
      <div className="rounded-xl border border-surface bg-surface-2 p-4 space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-3">Lesson Metadata</h3>
        {[
          { key: 'title', value: SARAJEVO_SPEC.title, assumed: false, locked: true },
          { key: 'subject', value: SARAJEVO_SPEC.subject, assumed: false, locked: false },
          { key: 'gradeLevel', value: String(SARAJEVO_SPEC.gradeLevel), assumed: false, locked: false },
          { key: 'template', value: SARAJEVO_SPEC.template, assumed: true, locked: false },
          { key: 'status', value: SARAJEVO_SPEC.status, assumed: false, locked: false },
        ].map(field => (
          <div key={field.key} className="flex items-center justify-between gap-4 group">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono text-muted flex-shrink-0">{field.key}</span>
              {field.assumed && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex-shrink-0">assumed</span>
              )}
              {field.locked && (
                <Lock className="w-3 h-3 text-slate-500 flex-shrink-0" />
              )}
            </div>
            <span className="text-[12px] text-slate-200 font-medium truncate">{field.value}</span>
          </div>
        ))}
      </div>

      {/* Phases */}
      {phases.map(phase => (
        <div key={phase.phaseId} className="rounded-xl border border-surface bg-surface-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[11px] font-mono text-brand">{phase.phaseId}</span>
              <p className="text-[13px] font-semibold text-white mt-0.5">{phase.beatTitle}</p>
            </div>
            <span className="text-[10px] text-muted bg-surface-3 px-2 py-0.5 rounded font-mono">
              {phase.interaction.type}
            </span>
          </div>
          <p className="text-[12px] text-subtle mb-3">{phase.narration.text}</p>
          {phase.grounding?.claims?.map((claim, i) => (
            <div key={i} className="flex items-start gap-2 py-2 border-t border-surface">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-slate-300">{claim.claim}</p>
                <p className="text-[10px] text-muted font-mono truncate mt-0.5">{claim.source}</p>
              </div>
              <span className="text-[10px] text-emerald-400 flex-shrink-0 mt-0.5">✓</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function SpecTab() {
  const [view, setView] = useState<View>('structured');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(specJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface bg-surface-1 flex-shrink-0">
        <div className="flex items-center gap-0.5">
          {(['structured', 'raw'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                'px-3 py-1 rounded text-[12px] font-medium transition-all',
                view === v ? 'bg-surface-3 text-white' : 'text-muted hover:text-slate-300'
              )}
            >
              {v === 'structured' ? 'Structured' : 'Raw JSON'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button className="p-1.5 rounded hover:bg-surface-3 text-muted hover:text-slate-300 transition-colors">
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'structured' ? (
          <StructuredView />
        ) : (
          <MonacoEditor
            height="100%"
            language="json"
            value={specJson}
            theme="vs-dark"
            options={{
              readOnly: false,
              fontSize: 12,
              fontFamily: '"JetBrains Mono", monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              lineNumbers: 'on',
              folding: true,
              scrollbar: { verticalScrollbarSize: 5 },
            }}
          />
        )}
      </div>

      <div className="px-3 py-1 border-t border-surface bg-surface-1 flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] text-muted font-mono">sarajevo-1914 · spec v1</span>
        <span className="text-[10px] text-muted">{specJson.split('\n').length} lines</span>
      </div>
    </div>
  );
}
