export type TabId = 'sources' | 'flow' | 'spec' | 'code';
export type LayoutPreset = 'build' | 'design' | 'review' | 'present';
export type NodeType = 'scene' | 'mechanic' | 'branch' | 'state' | 'asset';
export type NodeStatus = 'proposed' | 'generating' | 'accepted' | 'built' | 'error';
export type IntentType = 'definition' | 'process' | 'comparison' | 'data' | 'narrative';
export type DemoPhase = 'empty' | 'loading' | 'loaded' | 'interviewing' | 'ready' | 'building' | 'built';

export interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  subtitle: string;
  source?: string;
  finalStatus: NodeStatus;
  status: NodeStatus;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlowEdge {
  id: string;
  fromId: string;
  toId: string;
  edgeType: 'flow' | 'dependency';
}

export interface SlideData {
  id: string;
  index: number;
  title: string;
  intent: IntentType;
  body: string;
}

export interface InterviewCardDef {
  id: string;
  question: string;
  chips: string[];
  nodesToReveal: string[];
  assistantReply: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface DemoState {
  activeTab: TabId;
  layoutPreset: LayoutPreset;
  composerWidth: number;
  playWidth: number;
  composerCollapsed: boolean;
  demoPhase: DemoPhase;
  projectName: string;
  slides: SlideData[];
  flowNodes: FlowNode[];
  flowEdges: FlowEdge[];
  cards: InterviewCardDef[];
  currentCardIdx: number;
  answeredCards: Record<string, string>;
  messages: Message[];
  agentActivity: string;
  assumptionCount: number;
  lockCount: number;
  buildTime: string | null;
  versions: string[];
  activeVersion: string;
  flowHasNew: boolean;
}

export type DemoAction =
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'SET_LAYOUT'; preset: LayoutPreset }
  | { type: 'SET_COMPOSER_WIDTH'; width: number }
  | { type: 'SET_PLAY_WIDTH'; width: number }
  | { type: 'TOGGLE_COMPOSER' }
  | { type: 'SET_DEMO_PHASE'; phase: DemoPhase }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'SET_SLIDES'; slides: SlideData[] }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_CURRENT_CARD'; idx: number }
  | { type: 'ANSWER_CARD'; cardId: string; answer: string }
  | { type: 'REVEAL_NODE'; nodeId: string }
  | { type: 'SET_NODE_STATUS'; nodeId: string; status: NodeStatus }
  | { type: 'SET_AGENT_ACTIVITY'; activity: string }
  | { type: 'SET_ASSUMPTION_COUNT'; count: number }
  | { type: 'SET_LOCK_COUNT'; count: number }
  | { type: 'SET_BUILD_TIME'; time: string | null }
  | { type: 'ADD_VERSION'; version: string }
  | { type: 'SET_ACTIVE_VERSION'; version: string }
  | { type: 'CLEAR_FLOW_NEW' };
