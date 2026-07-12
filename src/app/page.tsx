import Link from "next/link";
import { ArrowRight, CheckCircle, Play, ShieldCheck, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[var(--paper)]">
      <nav className="mx-auto flex max-w-[1380px] items-center justify-between px-5 py-5 md:px-9">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Link href="/play/CELL42" className="focus-ring press hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-black/[.04] sm:block">Join a class</Link>
          <Link href="/teach" className="focus-ring press rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--paper)]">Open console</Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100dvh-82px)] max-w-[1380px] items-center gap-12 px-5 pb-16 pt-10 md:grid-cols-[.9fr_1.1fr] md:px-9 md:py-16">
        <div className="relative z-10 max-w-[610px] md:pl-[3vw]">
          <div className="rise mb-7 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/55 px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--sage)]" />
            Designed around teacher control
          </div>
          <h1 className="rise delay-1 text-[clamp(3.1rem,6.6vw,6.7rem)] font-semibold leading-[.9] tracking-[-0.075em]">
            Lessons they can <span className="text-[var(--accent)]">step into.</span>
          </h1>
          <p className="rise delay-2 mt-8 max-w-[56ch] text-base leading-7 text-[var(--muted)] md:text-lg">
            Turn slides or a simple prompt into a grounded interactive experience. Review every claim, conduct every phase, and see where the room needs you.
          </p>
          <div className="rise delay-3 mt-9 flex flex-wrap items-center gap-3">
            <Link href="/teach" className="focus-ring press inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3.5 text-sm font-bold text-white hover:bg-[var(--accent-dark)]">
              Build a lesson <ArrowRight size={17} weight="bold" />
            </Link>
            <Link href="/play/CELL42" className="focus-ring press inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-6 py-3.5 text-sm font-bold hover:bg-white">
              <Play size={16} weight="fill" /> Try student view
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold text-[var(--muted)]">
            <span className="flex items-center gap-2"><CheckCircle size={16} weight="fill" className="text-[var(--sage)]" /> Structured lesson specs</span>
            <span className="flex items-center gap-2"><ShieldCheck size={16} weight="fill" className="text-[var(--sage)]" /> Teacher-reviewed safety</span>
          </div>
        </div>

        <div className="rise delay-2 relative min-h-[580px] md:min-h-[680px]">
          <div className="absolute inset-x-[2%] top-[3%] h-[74%] rotate-[1.5deg] overflow-hidden rounded-[34px] bg-[#263c38] shadow-[0_35px_90px_-45px_oklch(0.28_0.06_160/.65)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_36%,rgba(185,224,188,.23),transparent_31%),linear-gradient(145deg,#172a28,#3b5d51_56%,#1e302f)]" />
            <div className="absolute left-[11%] top-[13%] text-[11px] font-bold uppercase tracking-[.22em] text-white/50">Phase 02 · Cell systems</div>
            <div className="absolute left-[10%] top-[22%] h-[46%] w-[44%] rounded-[48%] border border-white/15 bg-[radial-gradient(circle_at_35%_35%,#ec9a75,#9f4f50_48%,#462d3d_100%)] shadow-[inset_-18px_-22px_35px_rgba(25,16,26,.45),0_30px_80px_rgba(8,20,17,.45)]">
              <div className="absolute left-[17%] top-[32%] h-[9%] w-[66%] rotate-[-9deg] rounded-full bg-[#f3b48f]/70" />
              <div className="absolute left-[22%] top-[50%] h-[8%] w-[57%] rotate-[7deg] rounded-full bg-[#f3b48f]/60" />
            </div>
            <div className="absolute bottom-[14%] left-[11%] max-w-[250px] text-white">
              <p className="text-2xl font-semibold tracking-[-.04em]">Power at the mitochondrion</p>
              <p className="mt-2 text-sm leading-6 text-white/65">Move closer. Ask what it needs and what it produces.</p>
            </div>
            <div className="absolute bottom-[10%] right-[8%] rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">Hold to speak</div>
          </div>

          <div className="absolute bottom-[4%] right-0 w-[78%] rounded-[26px] border border-[var(--line)] bg-[oklch(.985_.006_70)] p-5 shadow-[0_24px_70px_-40px_oklch(.25_.04_55/.42)] md:w-[68%]">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
              <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[var(--muted)]">Live room</p><p className="mt-1 text-lg font-semibold tracking-[-.03em]">Ms. Alvarez · Science 6</p></div>
              <span className="mono rounded-full bg-[oklch(.91_.035_155)] px-3 py-1.5 text-xs font-bold text-[oklch(.42_.08_155)]">24 connected</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] items-end gap-6 py-5">
              <div><p className="text-xs font-semibold text-[var(--muted)]">Understanding now</p><p className="mono mt-1 text-4xl font-semibold tracking-[-.06em]">78%</p></div>
              <div className="flex h-14 items-end gap-1.5" aria-hidden="true">{[24,38,30,46,51,44,58,62,57,68,73,76].map((height, i) => <span key={i} className="w-2 rounded-full bg-[var(--accent)]/70" style={{ height: `${height}%` }} />)}</div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-[oklch(.95_.025_35)] p-3 text-xs leading-5 text-[oklch(.43_.07_32)]"><Sparkle size={18} weight="fill" /> Six students asked how ATP stores usable energy.</div>
          </div>
        </div>
      </section>
    </main>
  );
}
