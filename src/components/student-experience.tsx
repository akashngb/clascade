"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, HandTap, Microphone, Pause, Play, SignOut, SpeakerHigh } from "@phosphor-icons/react";
import { BrandMark } from "./brand-mark";
import { ScenePreview } from "./scene-preview";
import { sampleLessons } from "@/lib/fixtures";

export function StudentExperience({ code }: { code: string }) {
  const lesson = sampleLessons.find((item) => item.classCode === code.toUpperCase()) ?? sampleLessons[1];
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState("");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const phase = lesson.phases[Math.min(phaseIndex, lesson.phases.length - 1)];

  useEffect(() => {
    if (!joined) return;
    const sync = async () => {
      try {
        const response = await fetch(`/api/sessions/${code}`, { cache: "no-store" });
        const session = await response.json();
        setPhaseIndex(Math.min(session.currentPhase, lesson.phases.length - 1));
        setPaused(session.paused);
      } catch { /* Keep the last classroom state if the connection flickers. */ }
    };
    sync();
    const timer = setInterval(sync, 1500);
    return () => clearInterval(timer);
  }, [code, joined, lesson.phases.length]);

  const progress = useMemo(() => Math.round(((phaseIndex + (completed.includes(phaseIndex) ? 1 : 0)) / lesson.phases.length) * 100), [completed, lesson.phases.length, phaseIndex]);
  if (!joined) return <JoinScreen code={code} name={name} setName={setName} onJoin={() => name.trim() && setJoined(true)} />;

  return <main className="min-h-[100dvh] bg-[#203532] text-white">
    <div className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#203532]/80 px-4 backdrop-blur-md md:px-6"><BrandMark compact /><div className="hidden items-center gap-2 text-xs font-semibold text-white/55 sm:flex"><span className="h-2 w-2 rounded-full bg-[#89d4a2]" /> Synced with teacher</div><div className="flex items-center gap-4"><button className="text-white/55" aria-label="Audio"><SpeakerHigh size={19} /></button><Link href="/" className="text-white/55" aria-label="Leave class"><SignOut size={19} /></Link></div></div>
    <div className="relative min-h-[100dvh] pt-16">
      <ScenePreview accent={phase.scene.accent} />
      <div className="pointer-events-none absolute inset-0 top-16 bg-[linear-gradient(90deg,rgba(18,33,30,.74),transparent_48%),linear-gradient(0deg,rgba(18,33,30,.72),transparent_42%)]" />
      <div className="absolute left-4 top-24 max-w-[520px] md:left-10 md:top-28"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-white/45">Phase {String(phaseIndex + 1).padStart(2, "0")} · {lesson.title}</p><h1 className="mt-4 text-4xl font-semibold leading-[.98] tracking-[-.055em] md:text-6xl">{phase.beatTitle}</h1><p className="mt-4 max-w-[48ch] text-sm leading-6 text-white/65 md:text-base">{phase.narration}</p></div>
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8"><div className="mx-auto grid max-w-[1220px] gap-4 md:grid-cols-[1fr_360px]">
        <div className="self-end"><div className="mb-4 flex items-center gap-3"><span className="mono text-[10px] text-white/45">{progress}%</span><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-[var(--accent)] transition-transform duration-500" style={{ width: `${progress}%` }} /></div></div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-white/45">Current objective</p><p className="mt-2 text-xl font-semibold tracking-[-.03em]">{phase.interaction.prompt}</p></div>
        <Interaction phase={phase} answer={answer} setAnswer={setAnswer} complete={completed.includes(phaseIndex)} onComplete={() => setCompleted((items) => items.includes(phaseIndex) ? items : [...items, phaseIndex])} />
      </div></div>
      {paused && <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#192b28]/90 p-5 backdrop-blur-md"><div className="text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/[.06]"><Pause size={29} weight="fill" /></span><h2 className="mt-6 text-4xl font-semibold tracking-[-.05em]">Look up at your teacher.</h2><p className="mt-3 text-sm text-white/55">Your place is saved. The lesson will resume together.</p></div></div>}
    </div>
  </main>;
}

function JoinScreen({ code, name, setName, onJoin }: { code: string; name: string; setName: (name: string) => void; onJoin: () => void }) {
  return <main className="grid min-h-[100dvh] bg-[var(--paper)] md:grid-cols-[.8fr_1.2fr]"><section className="flex flex-col justify-between p-6 md:p-10"><BrandMark /><div className="mx-auto w-full max-w-[430px] py-16"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">Join class · {code.toUpperCase()}</p><h1 className="mt-4 text-5xl font-semibold leading-[.95] tracking-[-.065em]">Ready to step inside?</h1><p className="mt-5 text-sm leading-6 text-[var(--muted)]">Use the name your teacher knows. No account or email needed.</p><label className="mt-8 block text-xs font-bold" htmlFor="student-name">Your first name and last initial</label><input id="student-name" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onJoin()} placeholder="Maya K." className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[oklch(.99_.004_70)] px-4 py-3.5 text-sm outline-none focus:border-[var(--accent)]" /><button onClick={onJoin} className="focus-ring press mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] py-3.5 text-sm font-bold text-white">Enter lesson <ArrowRight size={17} weight="bold" /></button></div><p className="text-[10px] text-[var(--muted)]">Session names disappear when class ends.</p></section><section className="relative hidden overflow-hidden bg-[#253b37] md:block"><ScenePreview accent="#b05f51" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#203532] to-transparent p-12 pt-40 text-white"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/45">Today&apos;s lesson</p><p className="mt-3 text-4xl font-semibold tracking-[-.055em]">Journey Through a Cell</p><p className="mt-3 max-w-md text-sm leading-6 text-white/55">Your teacher controls the pace. Complete the objective, then explore until the room moves on.</p></div></section></main>;
}

function Interaction({ phase, answer, setAnswer, complete, onComplete }: { phase: (typeof sampleLessons)[number]["phases"][number]; answer: number | null; setAnswer: (value: number) => void; complete: boolean; onComplete: () => void }) {
  if (complete) return <div className="rounded-[22px] border border-white/10 bg-white/[.08] p-5 backdrop-blur-md"><CheckCircle size={24} weight="fill" className="text-[#92d3aa]" /><p className="mt-3 text-sm font-bold">Objective complete</p><p className="mt-1 text-xs text-white/50">Explore here until your teacher moves the class forward.</p></div>;
  if (phase.interaction.type === "quiz" && phase.interaction.choices) return <div className="rounded-[22px] border border-white/10 bg-[#172925]/80 p-4 backdrop-blur-md"><p className="mb-3 text-[10px] font-bold uppercase tracking-[.15em] text-white/45">Choose one</p><div className="grid gap-2">{phase.interaction.choices.map((choice, index) => <button key={choice} onClick={() => setAnswer(index)} className={`press rounded-xl border px-3 py-2.5 text-left text-xs font-semibold ${answer === index ? "border-[var(--accent)] bg-[var(--accent)]/20" : "border-white/10 bg-white/[.04]"}`}>{choice}</button>)}</div><button onClick={() => answer === phase.interaction.answerIndex && onComplete()} className="press mt-3 w-full rounded-full bg-white py-2.5 text-xs font-bold text-[var(--ink)]">Check answer</button></div>;
  if (phase.interaction.type === "dialogue") return <button onClick={onComplete} className="press flex min-h-32 w-full flex-col items-center justify-center rounded-[22px] border border-white/10 bg-white/[.08] backdrop-blur-md"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)]"><Microphone size={20} weight="fill" /></span><span className="mt-3 text-xs font-bold">Hold to speak</span><span className="mt-1 text-[10px] text-white/45">Ask a lesson question</span></button>;
  return <button onClick={onComplete} className="press flex min-h-32 w-full items-center gap-4 rounded-[22px] border border-white/10 bg-white/[.08] p-5 text-left backdrop-blur-md"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]"><HandTap size={20} weight="fill" /></span><span><span className="block text-sm font-bold">Mark objective complete</span><span className="mt-1 block text-xs text-white/45">Your teacher will see your progress.</span></span><Play size={18} weight="fill" className="ml-auto" /></button>;
}
