"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwise, ArrowRight, BracketsCurly, CaretDown, Check, CircleNotch,
  CheckCircle, Code, Copy, CornersIn, CornersOut, Cube, DeviceMobile, DotsThree, FileArrowUp, FileCode, FlowArrow, Gear,
  Lightning, MagicWand, Microphone, Monitor, PaperPlaneTilt,
  Pause, Play, Plus, PresentationChart, ShareNetwork, Sparkle,
  Trash, X,
} from "@phosphor-icons/react";
import {
  Background, BackgroundVariant, Controls, Handle, MarkerType, Position, ReactFlow,
  type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { ScenePreview } from "./scene-preview";
import { sampleLessons } from "@/lib/fixtures";
import type { LessonPhase, LessonSpec } from "@/lib/lesson-spec";

type WorkspaceTab = "flow" | "spec" | "renderer" | "scene" | "slides";
type MobilePane = "chat" | "workspace" | "preview";
type Inspector = "phase" | "safety" | "settings" | null;
type PreviewDevice = "desktop" | "mobile";
type StudioNodeData = { label: string; caption: string; kind: string; index: number; accent: string };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const tabs: Array<{ id: WorkspaceTab; label: string; icon: typeof FlowArrow }> = [
  { id: "flow", label: "Flow", icon: FlowArrow },
  { id: "spec", label: "lesson.json", icon: BracketsCurly },
  { id: "renderer", label: "renderer.ts", icon: FileCode },
  { id: "scene", label: "scene.ts", icon: Code },
  { id: "slides", label: "Slides", icon: PresentationChart },
];

const pipelineSteps = ["Reading source", "Mapping beats", "Checking claims", "Planning scenes", "Resolving assets"];

function LessonNode({ data }: NodeProps) {
  const node = data as StudioNodeData;
  return (
    <article className={`studio-flow-node studio-flow-node-${node.kind}`}>
      <Handle type="target" position={Position.Top} className="studio-handle" />
      <div className="studio-node-index">{String(node.index + 1).padStart(2, "0")}</div>
      <div>
        <p>{node.label}</p>
        <span>{node.caption}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="studio-handle" />
    </article>
  );
}

const nodeTypes = { lesson: LessonNode };

export function StudioConsole() {
  const [lesson, setLesson] = useState<LessonSpec>(sampleLessons[0]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("flow");
  const [mobilePane, setMobilePane] = useState<MobilePane>("chat");
  const [mode, setMode] = useState<"Design" | "Build" | "Present">("Build");
  const [prompt, setPrompt] = useState("");
  const [source, setSource] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pipelineIndex, setPipelineIndex] = useState(0);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "teacher"; text: string }>>([
    { role: "assistant", text: "I read the Sarajevo source and mapped four teachable moments. The third scene was reframed as a protected viewpoint for Grade 7." },
  ]);
  const [previewPlaying, setPreviewPlaying] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [activeVersion, setActiveVersion] = useState("v3");
  const [selectedPhaseId, setSelectedPhaseId] = useState(sampleLessons[0].phases[0].phaseId);
  const [inspector, setInspector] = useState<Inspector>(null);
  const [history, setHistory] = useState<LessonSpec[]>([]);
  const [toast, setToast] = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { nodes, edges } = useMemo(() => createFlow(lesson), [lesson]);
  const currentPhase = lesson.phases.find((phase) => phase.phaseId === selectedPhaseId) ?? lesson.phases[0];

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("clascade.studio.lesson");
        if (saved) {
          const parsed = JSON.parse(saved) as LessonSpec;
          if (parsed.version === "1.0" && parsed.phases?.length) {
            setLesson(parsed);
            setSelectedPhaseId(parsed.phases[0].phaseId);
          }
        }
      } catch { localStorage.removeItem("clascade.studio.lesson"); }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("clascade.studio.lesson", JSON.stringify(lesson));
  }, [hydrated, lesson]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(timeout);
  }, [toast]);

  const applyLesson = (next: LessonSpec, notice?: string) => {
    setHistory((items) => [...items.slice(-19), structuredClone(lesson)]);
    setLesson(next);
    if (notice) setToast(notice);
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) { setToast("Nothing to undo"); return; }
    setLesson(previous);
    setHistory((items) => items.slice(0, -1));
    setSelectedPhaseId(previous.phases[0].phaseId);
    setToast("Last lesson change undone");
  };

  const selectMode = (nextMode: "Design" | "Build" | "Present") => {
    setMode(nextMode);
    if (nextMode === "Design") { setActiveTab("flow"); setMobilePane("workspace"); setPreviewFullscreen(false); }
    if (nextMode === "Build") { setActiveTab("renderer"); setMobilePane("workspace"); setPreviewFullscreen(false); }
    if (nextMode === "Present") { setMobilePane("preview"); setPreviewFullscreen(true); }
  };

  const addPhase = () => {
    const index = lesson.phases.length;
    const phaseId = `${lesson.lessonId}-${crypto.randomUUID().slice(0, 8)}`;
    const phase: LessonPhase = {
      phaseId,
      beatTitle: `New phase ${index + 1}`,
      learningObjective: "Define what students should understand after this phase.",
      narration: "Add concise narration that introduces this moment in the lesson.",
      durationMinutes: 4,
      scene: { environment: "classroom_sandbox", cameraMove: "orbit_subject", accent: "#6f8fc5", assetQueries: ["classroom learning object"] },
      interaction: { type: "objective", prompt: "Complete the new learning objective.", completionEvent: `phase_${index + 1}_complete` },
      claims: [],
      teacherNote: "Add a teacher-only talking point.",
    };
    applyLesson({ ...lesson, phases: [...lesson.phases, phase] }, "Phase added");
    setSelectedPhaseId(phaseId);
    setInspector("phase");
  };

  const updatePhase = (nextPhase: LessonPhase) => {
    applyLesson({ ...lesson, phases: lesson.phases.map((phase) => phase.phaseId === nextPhase.phaseId ? nextPhase : phase) }, "Phase saved");
  };

  const deletePhase = (phaseId: string) => {
    if (lesson.phases.length <= 3) { setToast("A lesson needs at least three phases"); return; }
    const nextPhases = lesson.phases.filter((phase) => phase.phaseId !== phaseId);
    applyLesson({ ...lesson, phases: nextPhases }, "Phase removed");
    setSelectedPhaseId(nextPhases[0].phaseId);
    setInspector(null);
  };

  const publish = () => {
    const classCode = lesson.classCode || createClassCode();
    applyLesson({ ...lesson, status: "published", classCode }, `Published with class code ${classCode}`);
  };

  const approveSafety = () => {
    applyLesson({ ...lesson, safetyReport: { flags: lesson.safetyReport.flags.map((flag) => ({ ...flag, teacherApproved: true })) } }, "Safety adjustments approved");
  };

  const generate = async () => {
    const request = prompt.trim();
    const effectiveRequest = request || (!source ? `Rebuild ${lesson.title}. Preserve the learning objectives, improve the interaction flow, and keep it appropriate for Grade ${lesson.gradeLevel}.` : "");
    if (!effectiveRequest && !source) { setError("Describe a change or attach lesson material."); return; }
    setError("");
    setGenerating(true);
    setPipelineIndex(0);
    setMessages((items) => [...items, { role: "teacher", text: effectiveRequest || `Build from ${source?.name}.` }]);
    timer.current = setInterval(() => setPipelineIndex((value) => Math.min(value + 1, pipelineSteps.length - 1)), 850);
    try {
      const body = new FormData();
      body.set("description", effectiveRequest || `Create an interactive lesson from ${source?.name}.`);
      if (source) body.set("file", source);
      const response = await fetch("/api/lessons/generate", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Generation stopped.");
      applyLesson(result.lesson, "Vertex rebuilt the lesson spec");
      setSelectedPhaseId(result.lesson.phases[0].phaseId);
      setMessages((items) => [...items, { role: "assistant", text: `Built ${result.lesson.phases.length} connected phases using the ${result.lesson.template.replaceAll("_", " ")} template. The spec passed validation and is ready to review.` }]);
      setPrompt("");
      setSource(null);
      setActiveTab("flow");
      setMobilePane("workspace");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Generation stopped. Try again.");
    } finally {
      if (timer.current) clearInterval(timer.current);
      setGenerating(false);
    }
  };

  return (
    <main className={`studio-shell ${previewFullscreen ? "studio-preview-open" : ""}`}>
      <header className="studio-topbar">
        <div className="studio-project">
          <Link href="/" className="studio-logo" aria-label="Clascade home"><StudioGlyph /></Link>
          <span className="studio-project-name">{lesson.title.toLowerCase().replaceAll(" ", "_")}</span>
          <div className="studio-crumbs" aria-label="Build stages">
            <span>Sources</span><span>Flow</span><span>Spec</span><span className="active">Build</span>
          </div>
        </div>
        <div className="studio-mode-switch" aria-label="Workspace mode">
          {(["Design", "Build", "Present"] as const).map((item) => <button key={item} onClick={() => selectMode(item)} className={mode === item ? "active" : ""}>{item}</button>)}
        </div>
        <div className="studio-actions">
          <button onClick={undo} disabled={!history.length} className="studio-icon-button" aria-label="Undo"><ArrowCounterClockwise size={17} /></button>
          <button onClick={() => setInspector("settings")} className="studio-icon-button" aria-label="Settings"><Gear size={17} /></button>
          <button onClick={generate} className="studio-primary"><MagicWand size={16} weight="fill" /> Rebuild</button>
        </div>
      </header>

      <nav className="studio-mobile-tabs" aria-label="Mobile workspace panes">
        {(["chat", "workspace", "preview"] as const).map((pane) => <button key={pane} onClick={() => setMobilePane(pane)} className={mobilePane === pane ? "active" : ""}>{pane}</button>)}
      </nav>

      <section className="studio-desktop-workspace">
        <Group orientation="horizontal" id="studio-workspace" className="studio-panel-group">
          <Panel id="composer-panel" defaultSize="27%" minSize="19%" maxSize="55%">
            <ChatPanel lesson={lesson} messages={messages} prompt={prompt} setPrompt={setPrompt} source={source} setSource={setSource} generating={generating} pipelineIndex={pipelineIndex} error={error} onGenerate={generate} onApprove={approveSafety} onReviewSafety={() => setInspector("safety")} voiceListening={voiceListening} setVoiceListening={setVoiceListening} />
          </Panel>
          <Separator className="studio-resize-handle"><span /></Separator>
          <Panel id="work-panel" defaultSize="48%" minSize="28%">
            <WorkspacePanel lesson={lesson} activeTab={activeTab} setActiveTab={setActiveTab} nodes={nodes} edges={edges} onAddPhase={addPhase} onSelectPhase={(phaseId) => { setSelectedPhaseId(phaseId); setInspector("phase"); }} onNotice={setToast} />
          </Panel>
          <Separator className="studio-resize-handle"><span /></Separator>
          <Panel id="preview-panel" defaultSize="25%" minSize="18%" maxSize="42%">
            <PreviewPanel lesson={lesson} phase={currentPhase} playing={previewPlaying} setPlaying={setPreviewPlaying} device={previewDevice} setDevice={setPreviewDevice} fullscreen={previewFullscreen} setFullscreen={setPreviewFullscreen} version={activeVersion} setVersion={setActiveVersion} onPublish={publish} onNotice={setToast} />
          </Panel>
        </Group>
      </section>

      <section className="studio-mobile-workspace">
        {mobilePane === "chat" && <ChatPanel lesson={lesson} messages={messages} prompt={prompt} setPrompt={setPrompt} source={source} setSource={setSource} generating={generating} pipelineIndex={pipelineIndex} error={error} onGenerate={generate} onApprove={approveSafety} onReviewSafety={() => setInspector("safety")} voiceListening={voiceListening} setVoiceListening={setVoiceListening} />}
        {mobilePane === "workspace" && <WorkspacePanel lesson={lesson} activeTab={activeTab} setActiveTab={setActiveTab} nodes={nodes} edges={edges} onAddPhase={addPhase} onSelectPhase={(phaseId) => { setSelectedPhaseId(phaseId); setInspector("phase"); }} onNotice={setToast} />}
        {mobilePane === "preview" && <PreviewPanel lesson={lesson} phase={currentPhase} playing={previewPlaying} setPlaying={setPreviewPlaying} device={previewDevice} setDevice={setPreviewDevice} fullscreen={previewFullscreen} setFullscreen={setPreviewFullscreen} version={activeVersion} setVersion={setActiveVersion} onPublish={publish} onNotice={setToast} />}
      </section>

      <footer className="studio-statusbar">
        <div><span className="studio-status-dot" /> spec valid <strong>·</strong> {lesson.phases.length} phases <strong>·</strong> {lesson.phases.flatMap((phase) => phase.claims).length} grounded claims</div>
        <div><span>Vertex / Gemini Flash</span><span>autosaved just now</span></div>
      </footer>
      {inspector === "phase" && <PhaseInspector key={currentPhase.phaseId} phase={currentPhase} onSave={updatePhase} onDelete={deletePhase} onClose={() => setInspector(null)} />}
      {inspector === "safety" && <SafetyInspector lesson={lesson} onChange={(flags) => applyLesson({ ...lesson, safetyReport: { flags } }, "Safety review updated")} onClose={() => setInspector(null)} />}
      {inspector === "settings" && <SettingsInspector lesson={lesson} onChange={(next) => applyLesson(next, "Workspace settings saved")} onReset={() => { setHistory((items) => [...items, structuredClone(lesson)]); setLesson(sampleLessons[0]); setSelectedPhaseId(sampleLessons[0].phases[0].phaseId); setToast("Workspace reset"); }} onClose={() => setInspector(null)} />}
      {toast && <div className="studio-toast" role="status"><CheckCircle size={15} weight="fill" />{toast}</div>}
    </main>
  );
}

function ChatPanel({ lesson, messages, prompt, setPrompt, source, setSource, generating, pipelineIndex, error, onGenerate, onApprove, onReviewSafety, voiceListening, setVoiceListening }: {
  lesson: LessonSpec;
  messages: Array<{ role: "assistant" | "teacher"; text: string }>;
  prompt: string;
  setPrompt: (value: string) => void;
  source: File | null;
  setSource: (value: File | null) => void;
  generating: boolean;
  pipelineIndex: number;
  error: string;
  onGenerate: () => void;
  onApprove: () => void;
  onReviewSafety: () => void;
  voiceListening: boolean;
  setVoiceListening: (value: boolean) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const toggleVoice = () => {
    if (voiceListening) { recognitionRef.current?.stop(); setVoiceListening(false); return; }
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognition) { setPrompt("Voice input is not supported in this browser."); return; }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-CA";
    recognition.onresult = (event) => setPrompt(event.results[0][0].transcript);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => setVoiceListening(false);
    recognitionRef.current = recognition;
    setVoiceListening(true);
    recognition.start();
  };
  return (
    <section className="studio-pane studio-chat-pane" aria-label="Lesson chat">
      <header className="studio-pane-header">
        <div><span className="studio-pane-eyebrow">Composer</span><h1>Build with Clascade</h1></div>
        <button className="studio-icon-button" aria-label="Chat options"><DotsThree size={19} /></button>
      </header>
      <div className="studio-chat-scroll">
        <div className="studio-source-card">
          <div><FileArrowUp size={18} /><span>Source context</span></div>
          <strong>{source?.name || `${lesson.subject.toLowerCase()}_source_deck.pdf`}</strong>
          <p>{source ? `${(source.size / 1024).toFixed(0)} KB ready to analyze` : `${lesson.phases.length + 10} slides indexed · citations enabled`}</p>
        </div>
        {messages.map((message, index) => message.role === "assistant" ? (
          <div className="studio-assistant-message" key={`${message.role}-${index}`}>
            <span className="studio-assistant-mark"><Sparkle size={13} weight="fill" /></span>
            <div><p>{message.text}</p>{index === 0 && <div className="studio-message-actions"><button onClick={onApprove}><Check size={13} /> Keep adjustment</button><button onClick={onReviewSafety}>Review safety</button></div>}</div>
          </div>
        ) : <div className="studio-teacher-message" key={`${message.role}-${index}`}>{message.text}</div>)}
        {generating && <div className="studio-pipeline"><div className="studio-pipeline-title"><CircleNotch size={15} className="animate-spin" /> Building lesson spec</div>{pipelineSteps.map((step, index) => <div key={step} className={index < pipelineIndex ? "done" : index === pipelineIndex ? "active" : ""}><span>{index < pipelineIndex ? <Check size={11} /> : String(index + 1).padStart(2, "0")}</span>{step}</div>)}</div>}
      </div>
      <div className="studio-suggestion-row">
        {["Make phase 3 shorter", "Add a quiz", "Change the scene"].map((suggestion) => <button key={suggestion} onClick={() => setPrompt(suggestion)}>{suggestion}</button>)}
      </div>
      <div className="studio-composer-wrap">
        {source && <div className="studio-file-chip"><FileArrowUp size={13} /><span>{source.name}</span><button onClick={() => setSource(null)} aria-label="Remove source"><X size={12} /></button></div>}
        {error && <p className="studio-error">{error}</p>}
        <div className="studio-composer">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onGenerate(); } }} placeholder="Ask Clascade to build or revise..." aria-label="Lesson prompt" />
          <div className="studio-composer-tools">
            <label className="studio-tool-button" aria-label="Attach source"><Plus size={18} /><input className="sr-only" type="file" accept=".pdf,.ppt,.pptx,.txt,.md,image/*" onChange={(event) => setSource(event.target.files?.[0] || null)} /></label>
            <button onClick={toggleVoice} className={`studio-tool-button ${voiceListening ? "active" : ""}`} aria-label={voiceListening ? "Stop voice prompt" : "Voice prompt"}><Microphone size={17} /></button>
            <span className="studio-model">Flash <CaretDown size={11} /></span>
            <button onClick={onGenerate} disabled={generating} className="studio-send" aria-label="Send prompt"><PaperPlaneTilt size={16} weight="fill" /></button>
          </div>
        </div>
        <p className="studio-composer-note">Clascade can make mistakes. Review claims before presenting.</p>
      </div>
    </section>
  );
}

function WorkspacePanel({ lesson, activeTab, setActiveTab, nodes, edges, onAddPhase, onSelectPhase, onNotice }: { lesson: LessonSpec; activeTab: WorkspaceTab; setActiveTab: (tab: WorkspaceTab) => void; nodes: Node[]; edges: Edge[]; onAddPhase: () => void; onSelectPhase: (phaseId: string) => void; onNotice: (message: string) => void }) {
  return (
    <section className="studio-pane studio-work-pane" aria-label="Lesson workspace">
      <div className="studio-file-tabs" role="tablist">
        {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? "active" : ""}><tab.icon size={14} />{tab.label}{tab.id !== "flow" && tab.id !== "slides" && <span className="studio-unsaved" />}</button>)}
      </div>
      <div className="studio-work-content">
        {activeTab === "flow" && <FlowCanvas lesson={lesson} nodes={nodes} edges={edges} onAddPhase={onAddPhase} onSelectPhase={onSelectPhase} />}
        {activeTab === "spec" && <CodePanel language="json" code={JSON.stringify(lesson, null, 2)} onNotice={onNotice} />}
        {activeTab === "renderer" && <CodePanel language="typescript" code={rendererCode(lesson)} onNotice={onNotice} />}
        {activeTab === "scene" && <CodePanel language="typescript" code={sceneCode(lesson)} onNotice={onNotice} />}
        {activeTab === "slides" && <SlidesPanel lesson={lesson} onSelectPhase={onSelectPhase} />}
      </div>
    </section>
  );
}

function FlowCanvas({ lesson, nodes, edges, onAddPhase, onSelectPhase }: { lesson: LessonSpec; nodes: Node[]; edges: Edge[]; onAddPhase: () => void; onSelectPhase: (phaseId: string) => void }) {
  return (
    <div className="studio-flow-wrap">
      <div className="studio-flow-toolbar">
        <div><FlowArrow size={15} /><span>Story flow</span><strong>{lesson.phases.length} beats</strong></div>
        <div><button onClick={onAddPhase}><Plus size={14} /> Add phase</button><button onClick={() => onSelectPhase(lesson.phases[0].phaseId)} aria-label="Flow options"><DotsThree size={17} /></button></div>
      </div>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeClick={(_, node) => onSelectPhase(node.id)} nodesDraggable fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.35} maxZoom={1.25} proOptions={{ hideAttribution: true }}>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#34363b" />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
      <div className="studio-flow-hint"><Lightning size={13} weight="fill" /> Generated from the validated lesson spec</div>
    </div>
  );
}

function CodePanel({ language, code, onNotice }: { language: string; code: string; onNotice: (message: string) => void }) {
  const lines = code.split("\n");
  const copy = async () => { await navigator.clipboard.writeText(code); onNotice("File copied to clipboard"); };
  return <div className="studio-code-pane"><div className="studio-code-meta"><span>{language}</span><button onClick={copy}><Copy size={13} /> Copy file</button></div><pre>{lines.map((line, index) => <div key={index}><span className="studio-line-number">{String(index + 1).padStart(2, "0")}</span><code>{line || " "}</code></div>)}</pre></div>;
}

function SlidesPanel({ lesson, onSelectPhase }: { lesson: LessonSpec; onSelectPhase: (phaseId: string) => void }) {
  return <div className="studio-slides-grid">{lesson.phases.map((phase, index) => <button onClick={() => onSelectPhase(phase.phaseId)} key={phase.phaseId}><div className="studio-slide-visual" style={{ "--phase-accent": phase.scene.accent } as React.CSSProperties}><span>{String(index + 1).padStart(2, "0")}</span><Cube size={32} weight="duotone" /></div><strong>{phase.beatTitle}</strong><p>{phase.learningObjective}</p></button>)}</div>;
}

function PreviewPanel({ lesson, phase, playing, setPlaying, device, setDevice, fullscreen, setFullscreen, version, setVersion, onPublish, onNotice }: { lesson: LessonSpec; phase: LessonPhase; playing: boolean; setPlaying: (value: boolean) => void; device: PreviewDevice; setDevice: (device: PreviewDevice) => void; fullscreen: boolean; setFullscreen: (value: boolean) => void; version: string; setVersion: (version: string) => void; onPublish: () => void; onNotice: (message: string) => void }) {
  const share = async () => {
    const url = `${window.location.origin}/play/${lesson.classCode || "CELL42"}`;
    await navigator.clipboard.writeText(url);
    onNotice("Student link copied");
  };
  return (
    <section className={`studio-pane studio-preview-pane ${fullscreen ? "fullscreen" : ""}`} aria-label="Artifact preview">
      <header className="studio-preview-header"><div><Monitor size={15} /><span>Play</span></div><div><button onClick={share} aria-label="Copy student link"><ShareNetwork size={16} /></button><button onClick={() => setFullscreen(!fullscreen)} aria-label={fullscreen ? "Exit fullscreen preview" : "Fullscreen preview"}>{fullscreen ? <CornersIn size={15} /> : <CornersOut size={15} />}</button></div></header>
      <div className="studio-preview-body">
        <div className="studio-device-bar"><button onClick={() => setDevice("desktop")} className={device === "desktop" ? "active" : ""} aria-label="Desktop preview"><Monitor size={13} /></button><button onClick={() => setDevice("mobile")} className={device === "mobile" ? "active" : ""} aria-label="Mobile preview"><DeviceMobile size={13} /></button><span>{device === "desktop" ? "100%" : "390 px"}</span></div>
        <div className={`studio-artifact-frame ${device === "mobile" ? "mobile" : ""}`}>
          <ScenePreview accent={phase.scene.accent} />
          <div className="studio-artifact-shade" />
          <div className="studio-artifact-top"><span>Phase 02</span><span>{lesson.subject}</span></div>
          <div className="studio-artifact-copy"><span>Explore</span><h2>{phase.beatTitle}</h2><p>{phase.interaction.prompt}</p></div>
          <button onClick={() => setPlaying(!playing)} className="studio-play-button" aria-label={playing ? "Pause preview" : "Play preview"}>{playing ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}</button>
        </div>
        <div className="studio-preview-status"><span><span className="studio-live-dot" /> Live preview</span><span>30 FPS</span></div>
      </div>
      <div className="studio-preview-footer">
        <div className="studio-version-row"><span>Version</span>{["v1", "v2", "v3"].map((item) => <button onClick={() => { setVersion(item); onNotice(`Previewing ${item}`); }} key={item} className={version === item ? "active" : ""}>{item}</button>)}</div>
        <div className="studio-publish-row"><Link href={`/play/${lesson.classCode || "CELL42"}`}>Open student view <ArrowRight size={13} /></Link><button onClick={onPublish}><ShareNetwork size={14} /> {lesson.status === "published" ? lesson.classCode : "Publish"}</button></div>
      </div>
    </section>
  );
}

function PhaseInspector({ phase, onSave, onDelete, onClose }: { phase: LessonPhase; onSave: (phase: LessonPhase) => void; onDelete: (phaseId: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(phase);
  return <div className="studio-inspector-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="studio-inspector" aria-label="Phase editor"><header><div><span>Phase editor</span><h2>{phase.beatTitle}</h2></div><button onClick={onClose} aria-label="Close phase editor"><X size={17} /></button></header><div className="studio-inspector-scroll"><label>Beat title<input value={draft.beatTitle} onChange={(event) => setDraft({ ...draft, beatTitle: event.target.value })} /></label><label>Learning objective<textarea value={draft.learningObjective} onChange={(event) => setDraft({ ...draft, learningObjective: event.target.value })} /></label><label>Narration<textarea className="tall" value={draft.narration} onChange={(event) => setDraft({ ...draft, narration: event.target.value })} /></label><div className="studio-form-grid"><label>Duration<input type="number" min={1} max={20} value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: Math.max(1, Math.min(20, Number(event.target.value))) })} /></label><label>Interaction<select value={draft.interaction.type} onChange={(event) => setDraft({ ...draft, interaction: { ...draft.interaction, type: event.target.value as LessonPhase["interaction"]["type"] } })}>{["explore", "objective", "quiz", "sandbox_params", "dialogue", "none"].map((item) => <option key={item}>{item}</option>)}</select></label></div><label>Student prompt<textarea value={draft.interaction.prompt} onChange={(event) => setDraft({ ...draft, interaction: { ...draft.interaction, prompt: event.target.value } })} /></label><label>Environment<input value={draft.scene.environment} onChange={(event) => setDraft({ ...draft, scene: { ...draft.scene, environment: event.target.value } })} /></label><label>Teacher note<textarea value={draft.teacherNote} onChange={(event) => setDraft({ ...draft, teacherNote: event.target.value })} /></label></div><footer><button onClick={() => onDelete(phase.phaseId)} className="studio-danger"><Trash size={14} /> Delete</button><button onClick={() => { onSave(draft); onClose(); }} className="studio-save"><Check size={14} /> Save phase</button></footer></aside></div>;
}

function SafetyInspector({ lesson, onChange, onClose }: { lesson: LessonSpec; onChange: (flags: LessonSpec["safetyReport"]["flags"]) => void; onClose: () => void }) {
  const flags = lesson.safetyReport.flags;
  return <div className="studio-inspector-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="studio-inspector" aria-label="Safety review"><header><div><span>Teacher review</span><h2>Safety adjustments</h2></div><button onClick={onClose} aria-label="Close safety review"><X size={17} /></button></header><div className="studio-inspector-scroll">{flags.length === 0 ? <div className="studio-empty-review"><ShieldReviewIcon /><strong>No adjustments required</strong><p>The current lesson passed its age-aware presentation check.</p></div> : flags.map((flag) => <article className="studio-safety-item" key={flag.id}><div><span>{flag.severity}</span><span>{flag.phaseId}</span></div><strong>{flag.issue}</strong><p>{flag.adjustment}</p><button onClick={() => onChange(flags.map((item) => item.id === flag.id ? { ...item, teacherApproved: !item.teacherApproved } : item))} className={flag.teacherApproved ? "approved" : ""}>{flag.teacherApproved ? <CheckCircle size={14} weight="fill" /> : null}{flag.teacherApproved ? "Approved" : "Approve adjustment"}</button></article>)}</div><footer><span className="studio-review-count">{flags.filter((flag) => flag.teacherApproved).length} of {flags.length} cleared</span><button onClick={onClose} className="studio-save">Done</button></footer></aside></div>;
}

function SettingsInspector({ lesson, onChange, onReset, onClose }: { lesson: LessonSpec; onChange: (lesson: LessonSpec) => void; onReset: () => void; onClose: () => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [grade, setGrade] = useState(lesson.gradeLevel);
  const [template, setTemplate] = useState(lesson.template);
  return <div className="studio-inspector-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="studio-inspector" aria-label="Workspace settings"><header><div><span>Project</span><h2>Workspace settings</h2></div><button onClick={onClose} aria-label="Close settings"><X size={17} /></button></header><div className="studio-inspector-scroll"><label>Lesson title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Grade level<input type="number" min={1} max={12} value={grade} onChange={(event) => setGrade(Math.max(1, Math.min(12, Number(event.target.value))))} /></label><label>Pedagogy template<select value={template} onChange={(event) => setTemplate(event.target.value as LessonSpec["template"])}><option value="cinematic_timeline">Cinematic timeline</option><option value="scale_journey">Scale journey</option><option value="parameter_sandbox">Parameter sandbox</option></select></label><div className="studio-settings-info"><Lightning size={16} weight="fill" /><div><strong>Vertex AI generation</strong><p>Gemini Flash fills the validated spec. Renderer code remains hand-built.</p></div></div><button onClick={onReset} className="studio-reset-workspace">Reset to sample lesson</button></div><footer><button onClick={onClose}>Cancel</button><button onClick={() => { onChange({ ...lesson, title: title.trim() || lesson.title, gradeLevel: grade, template }); onClose(); }} className="studio-save">Save settings</button></footer></aside></div>;
}

function ShieldReviewIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 20 6v5.4c0 5-3.3 8.7-8 10.1-4.7-1.4-8-5.1-8-10.1V6l8-3.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="m8.4 12 2.2 2.2 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

function createFlow(lesson: LessonSpec): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = lesson.phases.map((phase, index) => ({
    id: phase.phaseId,
    type: "lesson",
    position: { x: index % 2 === 0 ? 80 : 370, y: index * 170 },
    data: { label: phase.beatTitle, caption: phase.interaction.type.replaceAll("_", " "), kind: phase.interaction.type, index, accent: phase.scene.accent },
  }));
  const edges: Edge[] = lesson.phases.slice(0, -1).map((phase, index) => ({
    id: `${phase.phaseId}-${lesson.phases[index + 1].phaseId}`,
    source: phase.phaseId,
    target: lesson.phases[index + 1].phaseId,
    type: "smoothstep",
    animated: index === 0,
    style: { stroke: index === 0 ? "#8ab4f8" : "#60646c", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: index === 0 ? "#8ab4f8" : "#60646c", width: 15, height: 15 },
  }));
  return { nodes, edges };
}

function rendererCode(lesson: LessonSpec) {
  return `import { LessonRenderer } from "@clascade/runtime";\nimport lesson from "./lesson.json";\n\nconst renderer = new LessonRenderer({\n  template: "${lesson.template}",\n  pixelRatio: Math.min(devicePixelRatio, 1.5),\n  telemetry: true,\n});\n\nrenderer.load(lesson);\nrenderer.mount(document.querySelector("#lesson-root"));\nrenderer.start();`;
}

function sceneCode(lesson: LessonSpec) {
  const phase = lesson.phases[0];
  return `export const openingScene = {\n  environment: "${phase.scene.environment}",\n  camera: "${phase.scene.cameraMove}",\n  accent: "${phase.scene.accent}",\n  assets: ${JSON.stringify(phase.scene.assetQueries, null, 2)},\n  interaction: {\n    type: "${phase.interaction.type}",\n    completionEvent: "${phase.interaction.completionEvent}"\n  }\n};`;
}

function StudioGlyph() {
  return <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M7 7.8A3.8 3.8 0 0 1 10.8 4h6.4A3.8 3.8 0 0 1 21 7.8v2.3h-2.7V8.3c0-.9-.7-1.6-1.6-1.6h-5.4c-.9 0-1.6.7-1.6 1.6v1.8H7V7.8Z" /><path d="M7 17.9h2.7v1.8c0 .9.7 1.6 1.6 1.6h5.4c.9 0 1.6-.7 1.6-1.6v-1.8H21v2.3a3.8 3.8 0 0 1-3.8 3.8h-6.4A3.8 3.8 0 0 1 7 20.2v-2.3Z" /><path d="M4 12.6h20v2.8H4z" /></svg>;
}

function createClassCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
