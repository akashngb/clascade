import type { FlowNode, FlowEdge, SlideData, InterviewCardDef } from './types';

export const DEMO_SLIDES: SlideData[] = [
  { id: 's1', index: 1, title: 'What is Photosynthesis?', intent: 'definition', body: 'Light energy converted to chemical energy stored in glucose' },
  { id: 's2', index: 2, title: 'The Chloroplast', intent: 'definition', body: 'Organelle structure: thylakoids, stroma, inner/outer membranes' },
  { id: 's3', index: 3, title: 'Light Reactions', intent: 'process', body: 'Photon capture → electron transport → ATP + NADPH' },
  { id: 's4', index: 4, title: 'Calvin Cycle', intent: 'process', body: 'CO₂ fixation: carbon fixation → reduction → RuBP regeneration' },
  { id: 's5', index: 5, title: 'Reactants vs Products', intent: 'comparison', body: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂' },
  { id: 's6', index: 6, title: 'Rate of Photosynthesis', intent: 'data', body: 'Light intensity curves, CO₂ concentration effects' },
  { id: 's7', index: 7, title: 'C3 vs C4 Plants', intent: 'comparison', body: 'Pathway differences, efficiency in hot/arid climates' },
  { id: 's8', index: 8, title: 'Limiting Factors', intent: 'data', body: 'Temperature, CO₂ concentration, light intensity' },
  { id: 's9', index: 9, title: 'Ecosystem Role', intent: 'narrative', body: 'Primary production, oxygen supply, food web base' },
  { id: 's10', index: 10, title: 'Human Impacts', intent: 'narrative', body: 'Deforestation, elevated CO₂, climate feedback loops' },
];

export const DEMO_NODES: FlowNode[] = [
  {
    id: 'intro-scene',
    type: 'scene',
    label: 'Intro scene',
    subtitle: 'from slide 1',
    source: 'slide 1',
    finalStatus: 'built',
    status: 'proposed',
    visible: false,
    x: 280, y: 40, width: 210, height: 76,
  },
  {
    id: 'sort-reactants',
    type: 'mechanic',
    label: 'Sort the reactants',
    subtitle: 'drag and drop',
    source: 'slides 4–7',
    finalStatus: 'built',
    status: 'proposed',
    visible: false,
    x: 80, y: 200, width: 210, height: 76,
  },
  {
    id: 'boss-quiz',
    type: 'mechanic',
    label: 'Boss quiz',
    subtitle: 'proposed — accept?',
    source: 'slide 8',
    finalStatus: 'proposed',
    status: 'proposed',
    visible: false,
    x: 480, y: 200, width: 210, height: 76,
  },
  {
    id: 'score-unlock',
    type: 'state',
    label: 'Score and unlock',
    subtitle: 'from slides 12 to 14',
    source: 'slides 9–10',
    finalStatus: 'built',
    status: 'proposed',
    visible: false,
    x: 280, y: 360, width: 210, height: 76,
  },
];

export const DEMO_EDGES: FlowEdge[] = [
  { id: 'e1', fromId: 'intro-scene', toId: 'sort-reactants', edgeType: 'flow' },
  { id: 'e2', fromId: 'intro-scene', toId: 'boss-quiz', edgeType: 'flow' },
  { id: 'e3', fromId: 'sort-reactants', toId: 'score-unlock', edgeType: 'flow' },
  { id: 'e4', fromId: 'boss-quiz', toId: 'score-unlock', edgeType: 'flow' },
];

export const INTERVIEW_CARDS: InterviewCardDef[] = [
  {
    id: 'audience',
    question: "Who's playing?",
    chips: ['Gr. 9', 'Adults', 'Mixed'],
    nodesToReveal: ['intro-scene'],
    assistantReply: "Got it — Grade 9. I'll keep the vocabulary accessible and the mechanics intuitive. Building the opening scene now...",
  },
  {
    id: 'duration',
    question: 'How long is the session?',
    chips: ['10 min', '20 min', 'Full period'],
    nodesToReveal: ['sort-reactants', 'boss-quiz'],
    assistantReply: "20 minutes — room for two mechanics and a checkpoint. Adding a reactant-sorting challenge and a proposed boss quiz. You can reject the quiz if it feels like too much.",
  },
  {
    id: 'mode',
    question: 'Cooperative or competitive?',
    chips: ['Cooperative', 'Competitive', 'Both'],
    nodesToReveal: ['score-unlock'],
    assistantReply: "Competitive with a leaderboard. Wiring in score-and-unlock at the end. Flow looks solid — hit Rebuild when you're ready.",
  },
];

export const SARAJEVO_SPEC = {
  lessonId: 'hero-history-sarajevo-1914',
  title: 'Sarajevo, 1914: The Spark',
  subject: 'history',
  gradeLevel: 7,
  template: 'cinematic_timeline',
  sourceDeck: 'uploads/ww1-intro.pdf',
  teacherVoiceId: null,
  status: 'reviewed',
  safetyReport: {
    flags: [
      {
        phaseId: 'phase-4',
        issue: 'depicts_violence',
        adjustment: 'Student role changed from actor to bystander; event shown via cinematic cutaway.',
        teacherApproved: true,
      },
    ],
  },
  phases: [
    {
      phaseId: 'phase-1',
      beatTitle: 'Sarajevo — 28 June 1914',
      learningObjective: 'Situate the assassination in time and place.',
      narration: {
        text: "It is the morning of June 28th, 1914. The cobblestone streets of Sarajevo hum with anticipation...",
        voice: 'stock',
        audioAsset: 'assets/audio/sarajevo/phase1-narration.mp3',
      },
      scene: {
        environment: 'sarajevo_street',
        cameraScript: [
          { move: 'date_title_cinematic', duration: 4 },
          { move: 'crane_down_to_street', duration: 6 },
        ],
        actors: [],
        music: { asset: 'assets/audio/sarajevo/lyria-phase1.mp3', mood: 'tense_strings' },
      },
      interaction: { type: 'none' },
      grounding: {
        claims: [
          {
            claim: 'Archduke Franz Ferdinand visited Sarajevo on June 28th, 1914.',
            source: 'https://www.britannica.com/event/assassination-of-Archduke-Franz-Ferdinand',
            confidence: 'high',
            teacherApproved: true,
          },
        ],
      },
    },
    {
      phaseId: 'phase-2',
      beatTitle: 'The City Waits',
      learningObjective: 'Identify rising tensions in Austro-Hungarian Bosnia.',
      narration: {
        text: "Posters line the walls. The Archduke's motorcade route is public knowledge. In the crowd, seven conspirators wait...",
        voice: 'stock',
        audioAsset: 'assets/audio/sarajevo/phase2-narration.mp3',
      },
      scene: {
        environment: 'sarajevo_street',
        cameraScript: [{ move: 'first_person_walk', duration: 10 }],
        actors: [],
        music: { asset: 'assets/audio/sarajevo/lyria-phase2.mp3', mood: 'tense_strings' },
      },
      interaction: {
        type: 'objective',
        objective: 'Find the newspaper stand and read the headline.',
        completionEvent: 'read_headline',
      },
      grounding: {
        claims: [
          {
            claim: 'The motorcade route was published in advance in local newspapers.',
            source: 'https://www.history.com/topics/world-war-i/assassination-of-archduke-franz-ferdinand',
            confidence: 'high',
            teacherApproved: true,
          },
        ],
      },
    },
  ],
};

export const TEMPLATE_CODE = `// cinematic_timeline.js — Template T1
// The LLM fills the spec; this file never changes.

import * as THREE from 'three';

export class CinematicTimeline {
  constructor(spec, container) {
    this.spec = spec;
    this.currentPhaseIndex = 0;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    this.clock = new THREE.Clock();
    this.init(container);
  }

  init(container) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);
    this.setupLighting();
    this.loadPhase(this.spec.phases[0]);
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xfff4e0, 0.4);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffe5b4, 2.5);
    sun.position.set(30, 60, -20);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    this.scene.add(sun);
  }

  loadPhase(phase) {
    this.clearScene();
    this.currentPhase = phase;
    this.runCameraScript(phase.scene.cameraScript);
    if (phase.interaction.type !== 'none') {
      this.activateInteraction(phase.interaction);
    }
  }

  runCameraScript(script) {
    script.forEach(({ move, duration }) => {
      this.cameraDirector.queue(move, duration);
    });
    this.cameraDirector.play();
  }

  nextPhase() {
    const next = this.spec.phases[++this.currentPhaseIndex];
    if (next) this.loadPhase(next);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    this.cameraDirector?.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}`;
