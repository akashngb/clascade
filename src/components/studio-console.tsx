"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwise, ArrowRight, BracketsCurly, CaretDown, Check, CircleNotch,
  Code, CornersOut, Cube, DotsThree, FileArrowUp, FileCode, FlowArrow, Gear,
  Lightning, MagicWand, Microphone, Monitor, PaperPlaneTilt,
  Pause, Play, Plus, PresentationChart, ShareNetwork, Sparkle, SquaresFour,
  Terminal, X,
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
type StudioNodeData = { label: string; caption: string; kind: string; index: number; accent: string };

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
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { nodes, edges } = useMemo(() => createFlow(lesson), [lesson]);
  const currentPhase = lesson.phases[Math.min(1, lesson.phases.length - 1)];

  const generate = async () => {
    const request = prompt.trim();
    if (!request && !source) { setError("Describe a change or attach lesson material."); return; }
    setError("");
    setGenerating(true);
    setPipelineIndex(0);
    if (request) setMessages((items) => [...items, { role: "teacher", text: request }]);
    timer.current = setInterval(() => setPipelineIndex((value) => Math.min(value + 1, pipelineSteps.length - 1)), 850);
    try {
      const body = new FormData();
      body.set("description", request || `Create an interactive lesson from ${source?.name}.`);
      if (source) body.set("file", source);
      const response = await fetch("/api/lessons/generate", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Generation stopped.");
      setLesson(result.lesson);
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
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-project">
          <Link href="/" className="studio-logo" aria-label="Clascade home"><StudioGlyph /></Link>
          <span className="studio-project-name">{lesson.title.toLowerCase().replaceAll(" ", "_")}</span>
          <div className="studio-crumbs" aria-label="Build stages">
            <span>Sources</span><span>Flow</span><span>Spec</span><span className="active">Build</span>
          </div>
        </div>
        <div className="studio-mode-switch" aria-label="Workspace mode">
          {(["Design", "Build", "Present"] as const).map((item) => <button key={item} onClick={() => setMode(item)} className={mode === item ? "active" : ""}>{item}</button>)}
        </div>
        <div className="studio-actions">
          <button className="studio-icon-button" aria-label="Undo"><ArrowCounterClockwise size={17} /></button>
          <button className="studio-icon-button" aria-label="Settings"><Gear size={17} /></button>
          <button onClick={generate} className="studio-primary"><MagicWand size={16} weight="fill" /> Rebuild</button>
        </div>
      </header>

      <nav className="studio-mobile-tabs" aria-label="Mobile workspace panes">
        {(["chat", "workspace", "preview"] as const).map((pane) => <button key={pane} onClick={() => setMobilePane(pane)} className={mobilePane === pane ? "active" : ""}>{pane}</button>)}
      </nav>

      <section className="studio-desktop-workspace">
        <Group orientation="horizontal" id="studio-workspace" className="studio-panel-group">
          <Panel id="composer-panel" defaultSize="27%" minSize="19%" maxSize="55%">
            <ChatPanel lesson={lesson} messages={messages} prompt={prompt} setPrompt={setPrompt} source={source} setSource={setSource} generating={generating} pipelineIndex={pipelineIndex} error={error} onGenerate={generate} />
          </Panel>
          <Separator className="studio-resize-handle"><span /></Separator>
          <Panel id="work-panel" defaultSize="48%" minSize="28%">
            <WorkspacePanel lesson={lesson} activeTab={activeTab} setActiveTab={setActiveTab} nodes={nodes} edges={edges} />
          </Panel>
          <Separator className="studio-resize-handle"><span /></Separator>
          <Panel id="preview-panel" defaultSize="25%" minSize="18%" maxSize="42%">
            <PreviewPanel lesson={lesson} phase={currentPhase} playing={previewPlaying} setPlaying={setPreviewPlaying} />
          </Panel>
        </Group>
      </section>

      <section className="studio-mobile-workspace">
        {mobilePane === "chat" && <ChatPanel lesson={lesson} messages={messages} prompt={prompt} setPrompt={setPrompt} source={source} setSource={setSource} generating={generating} pipelineIndex={pipelineIndex} error={error} onGenerate={generate} />}
        {mobilePane === "workspace" && <WorkspacePanel lesson={lesson} activeTab={activeTab} setActiveTab={setActiveTab} nodes={nodes} edges={edges} />}
        {mobilePane === "preview" && <PreviewPanel lesson={lesson} phase={currentPhase} playing={previewPlaying} setPlaying={setPreviewPlaying} />}
      </section>

      <footer className="studio-statusbar">
        <div><span className="studio-status-dot" /> spec valid <strong>·</strong> {lesson.phases.length} phases <strong>·</strong> {lesson.phases.flatMap((phase) => phase.claims).length} grounded claims</div>
        <div><span>Vertex / Gemini Flash</span><span>autosaved just now</span></div>
      </footer>
    </main>
  );
}

function ChatPanel({ lesson, messages, prompt, setPrompt, source, setSource, generating, pipelineIndex, error, onGenerate }: {
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
}) {
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
            <div><p>{message.text}</p>{index === 0 && <div className="studio-message-actions"><button onClick={() => undefined}><Check size={13} /> Keep adjustment</button><button onClick={() => undefined}>Review safety</button></div>}</div>
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
            <button className="studio-tool-button" aria-label="Voice prompt"><Microphone size={17} /></button>
            <span className="studio-model">Flash <CaretDown size={11} /></span>
            <button onClick={onGenerate} disabled={generating} className="studio-send" aria-label="Send prompt"><PaperPlaneTilt size={16} weight="fill" /></button>
          </div>
        </div>
        <p className="studio-composer-note">Clascade can make mistakes. Review claims before presenting.</p>
      </div>
    </section>
  );
}

function WorkspacePanel({ lesson, activeTab, setActiveTab, nodes, edges }: { lesson: LessonSpec; activeTab: WorkspaceTab; setActiveTab: (tab: WorkspaceTab) => void; nodes: Node[]; edges: Edge[] }) {
  return (
    <section className="studio-pane studio-work-pane" aria-label="Lesson workspace">
      <div className="studio-file-tabs" role="tablist">
        {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? "active" : ""}><tab.icon size={14} />{tab.label}{tab.id !== "flow" && tab.id !== "slides" && <span className="studio-unsaved" />}</button>)}
      </div>
      <div className="studio-work-content">
        {activeTab === "flow" && <FlowCanvas lesson={lesson} nodes={nodes} edges={edges} />}
        {activeTab === "spec" && <CodePanel language="json" code={JSON.stringify(lesson, null, 2)} />}
        {activeTab === "renderer" && <CodePanel language="typescript" code={rendererCode(lesson)} />}
        {activeTab === "scene" && <CodePanel language="typescript" code={sceneCode(lesson)} />}
        {activeTab === "slides" && <SlidesPanel lesson={lesson} />}
      </div>
    </section>
  );
}

function FlowCanvas({ lesson, nodes, edges }: { lesson: LessonSpec; nodes: Node[]; edges: Edge[] }) {
  return (
    <div className="studio-flow-wrap">
      <div className="studio-flow-toolbar">
        <div><FlowArrow size={15} /><span>Story flow</span><strong>{lesson.phases.length} beats</strong></div>
        <div><button><Plus size={14} /> Add phase</button><button aria-label="Flow options"><DotsThree size={17} /></button></div>
      </div>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.35} maxZoom={1.25} proOptions={{ hideAttribution: true }}>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#34363b" />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
      <div className="studio-flow-hint"><Lightning size={13} weight="fill" /> Generated from the validated lesson spec</div>
    </div>
  );
}

function CodePanel({ language, code }: { language: string; code: string }) {
  const lines = code.split("\n");
  return <div className="studio-code-pane"><div className="studio-code-meta"><span>{language}</span><button><Terminal size={13} /> Open terminal</button></div><pre>{lines.map((line, index) => <div key={index}><span className="studio-line-number">{String(index + 1).padStart(2, "0")}</span><code>{line || " "}</code></div>)}</pre></div>;
}

function SlidesPanel({ lesson }: { lesson: LessonSpec }) {
  return <div className="studio-slides-grid">{lesson.phases.map((phase, index) => <article key={phase.phaseId}><div className="studio-slide-visual" style={{ "--phase-accent": phase.scene.accent } as React.CSSProperties}><span>{String(index + 1).padStart(2, "0")}</span><Cube size={32} weight="duotone" /></div><strong>{phase.beatTitle}</strong><p>{phase.learningObjective}</p></article>)}</div>;
}

function PreviewPanel({ lesson, phase, playing, setPlaying }: { lesson: LessonSpec; phase: LessonPhase; playing: boolean; setPlaying: (value: boolean) => void }) {
  return (
    <section className="studio-pane studio-preview-pane" aria-label="Artifact preview">
      <header className="studio-preview-header"><div><Monitor size={15} /><span>Play</span></div><div><button aria-label="Preview options"><DotsThree size={17} /></button><button aria-label="Fullscreen preview"><CornersOut size={15} /></button></div></header>
      <div className="studio-preview-body">
        <div className="studio-device-bar"><button className="active"><Monitor size={13} /></button><button><SquaresFour size={13} /></button><span>100%</span></div>
        <div className="studio-artifact-frame">
          <ScenePreview accent={phase.scene.accent} />
          <div className="studio-artifact-shade" />
          <div className="studio-artifact-top"><span>Phase 02</span><span>{lesson.subject}</span></div>
          <div className="studio-artifact-copy"><span>Explore</span><h2>{phase.beatTitle}</h2><p>{phase.interaction.prompt}</p></div>
          <button onClick={() => setPlaying(!playing)} className="studio-play-button" aria-label={playing ? "Pause preview" : "Play preview"}>{playing ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}</button>
        </div>
        <div className="studio-preview-status"><span><span className="studio-live-dot" /> Live preview</span><span>30 FPS</span></div>
      </div>
      <div className="studio-preview-footer">
        <div className="studio-version-row"><span>Version</span>{["v1", "v2", "v3"].map((version, index) => <button key={version} className={index === 2 ? "active" : ""}>{version}</button>)}</div>
        <div className="studio-publish-row"><Link href={`/play/${lesson.classCode || "CELL42"}`}>Open student view <ArrowRight size={13} /></Link><button><ShareNetwork size={14} /> Publish</button></div>
      </div>
    </section>
  );
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
