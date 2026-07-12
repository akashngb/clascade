import Link from "next/link";
import { ArrowRight, FileArrowUp, FlowArrow, Play, Sparkle } from "@phosphor-icons/react/dist/ssr";

export default function Home() {
  return (
    <main className="stitch-home">
      <nav className="stitch-nav">
        <Link href="/" className="stitch-wordmark"><span className="stitch-mark"><HomeGlyph /></span><span>Clascade</span></Link>
        <div className="stitch-nav-center"><a href="#workspace">Workspace</a><a href="#process">How it works</a><Link href="/play/CELL42">Join a class</Link></div>
        <Link href="/teach" className="stitch-nav-cta">Open studio <ArrowRight size={14} /></Link>
      </nav>

      <section className="stitch-hero">
        <div className="stitch-ambient" />
        <p className="stitch-kicker"><Sparkle size={13} weight="fill" /> Lesson builder for teachers</p>
        <h1>What should the room<br />step into?</h1>
        <p className="stitch-subtitle">Turn slides and source material into a grounded interactive lesson, then shape the flow before students see it.</p>
        <div className="stitch-prompt-card">
          <p>Build a Grade 7 lesson about the events that led to World War I...</p>
          <div><button aria-label="Attach lesson source"><FileArrowUp size={18} /></button><span>Gemini Flash <span className="stitch-chevron">⌄</span></span><Link href="/teach" aria-label="Build lesson"><ArrowRight size={17} /></Link></div>
        </div>
        <div className="stitch-prompt-suggestions"><span>Try</span><Link href="/teach">Journey through a cell</Link><Link href="/teach">Projectile motion lab</Link><Link href="/teach">The July Crisis</Link></div>
      </section>

      <section className="stitch-workspace-preview" id="workspace">
        <div className="stitch-preview-top"><div><span className="stitch-window-dot" /><strong>photosynthesis_deck</strong></div><div><span>Sources</span><span>Flow</span><span>Spec</span><span className="active">Build</span></div><Link href="/teach">Open project</Link></div>
        <div className="stitch-preview-grid">
          <aside><span>Composer</span><article><strong>Deck read. 14 slides.</strong><p>Slides 4 to 7 look like a process. Good fit for a build-the-chain level.</p></article><article className="blue"><strong>Who&apos;s playing?</strong><div><span>Grade 9</span><span>Pairs</span></div></article><div className="stitch-mini-input">Talk or type...</div></aside>
          <div className="stitch-flow-canvas"><div className="stitch-flow-header"><FlowArrow size={14} /> Story flow</div><article className="node n1">Enter the chloroplast<span>intro scene</span></article><article className="node n2">Sort the reactants<span>drag and drop</span></article><article className="node n3">Build glucose<span>assembly objective</span></article><article className="node n4">Score and unlock<span>quiz checkpoint</span></article><i className="line l1" /><i className="line l2" /><i className="line l3" /></div>
          <aside className="stitch-live-preview"><span>Play</span><div><div className="orb" /><p>Phase 02</p><h2>Sort the reactants</h2><button><Play size={13} weight="fill" /></button></div><footer><span>v1</span><span className="active">v2</span><span>v3</span></footer></aside>
        </div>
      </section>

      <section className="stitch-process" id="process"><div><p>One workspace</p><h2>Chat, shape, inspect, play.</h2></div><ol><li><span>01</span><strong>Bring the source</strong><p>Upload slides or describe the lesson in plain language.</p></li><li><span>02</span><strong>Shape the flow</strong><p>Review every phase on a visual story canvas.</p></li><li><span>03</span><strong>Test the artifact</strong><p>Play the same validated spec students receive.</p></li></ol></section>
    </main>
  );
}

function HomeGlyph() {
  return <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M7 7.8A3.8 3.8 0 0 1 10.8 4h6.4A3.8 3.8 0 0 1 21 7.8v2.3h-2.7V8.3c0-.9-.7-1.6-1.6-1.6h-5.4c-.9 0-1.6.7-1.6 1.6v1.8H7V7.8Z" /><path d="M7 17.9h2.7v1.8c0 .9.7 1.6 1.6 1.6h5.4c.9 0 1.6-.7 1.6-1.6v-1.8H21v2.3a3.8 3.8 0 0 1-3.8 3.8h-6.4A3.8 3.8 0 0 1 7 20.2v-2.3Z" /><path d="M4 12.6h20v2.8H4z" /></svg>;
}
