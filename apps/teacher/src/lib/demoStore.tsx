'use client';

import React, { createContext, useContext, useReducer } from 'react';
import { DEMO_NODES, DEMO_EDGES, INTERVIEW_CARDS } from './fixtures';
import type { DemoState, DemoAction } from './types';

const initialState: DemoState = {
  activeTab: 'sources',
  layoutPreset: 'build',
  composerWidth: 380,
  playWidth: 420,
  composerCollapsed: false,
  demoPhase: 'empty',
  projectName: 'New Project',
  slides: [],
  flowNodes: DEMO_NODES.map(n => ({ ...n })),
  flowEdges: DEMO_EDGES,
  cards: INTERVIEW_CARDS,
  currentCardIdx: -1,
  answeredCards: {},
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Upload your slides or pick an example deck — I\'ll ask a few quick questions, then build the game flow.',
      timestamp: new Date(),
    },
  ],
  agentActivity: '',
  assumptionCount: 0,
  lockCount: 0,
  buildTime: null,
  versions: [],
  activeVersion: 'v1',
  flowHasNew: false,
};

function reducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.tab, flowHasNew: action.tab === 'flow' ? false : state.flowHasNew };
    case 'SET_LAYOUT':
      return { ...state, layoutPreset: action.preset };
    case 'SET_COMPOSER_WIDTH':
      return { ...state, composerWidth: action.width };
    case 'SET_PLAY_WIDTH':
      return { ...state, playWidth: action.width };
    case 'TOGGLE_COMPOSER':
      return { ...state, composerCollapsed: !state.composerCollapsed };
    case 'SET_DEMO_PHASE':
      return { ...state, demoPhase: action.phase };
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name };
    case 'SET_SLIDES':
      return { ...state, slides: action.slides };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };
    case 'SET_CURRENT_CARD':
      return { ...state, currentCardIdx: action.idx };
    case 'ANSWER_CARD':
      return { ...state, answeredCards: { ...state.answeredCards, [action.cardId]: action.answer } };
    case 'REVEAL_NODE':
      return {
        ...state,
        flowHasNew: true,
        flowNodes: state.flowNodes.map(n =>
          n.id === action.nodeId ? { ...n, visible: true, status: 'generating' } : n
        ),
      };
    case 'SET_NODE_STATUS':
      return {
        ...state,
        flowNodes: state.flowNodes.map(n =>
          n.id === action.nodeId ? { ...n, status: action.status } : n
        ),
      };
    case 'SET_AGENT_ACTIVITY':
      return { ...state, agentActivity: action.activity };
    case 'SET_ASSUMPTION_COUNT':
      return { ...state, assumptionCount: action.count };
    case 'SET_LOCK_COUNT':
      return { ...state, lockCount: action.count };
    case 'SET_BUILD_TIME':
      return { ...state, buildTime: action.time };
    case 'ADD_VERSION':
      return {
        ...state,
        versions: state.versions.includes(action.version)
          ? state.versions
          : [...state.versions, action.version],
        activeVersion: action.version,
      };
    case 'SET_ACTIVE_VERSION':
      return { ...state, activeVersion: action.version };
    case 'CLEAR_FLOW_NEW':
      return { ...state, flowHasNew: false };
    default:
      return state;
  }
}

const DemoContext = createContext<{
  state: DemoState;
  dispatch: React.Dispatch<DemoAction>;
} | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <DemoContext.Provider value={{ state, dispatch }}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
