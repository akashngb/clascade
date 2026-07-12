import "server-only";

import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "node:crypto";
import { lessonResponseSchema, lessonSpecSchema, type LessonSpec } from "./lesson-spec";
import { sampleLessons } from "./fixtures";

type RawLesson = {
  title: string;
  subject: string;
  gradeLevel: number;
  template: LessonSpec["template"];
  summary: string;
  phases: Array<{
    beatTitle: string;
    learningObjective: string;
    narration: string;
    durationMinutes: number;
    environment: string;
    cameraMove: LessonSpec["phases"][number]["scene"]["cameraMove"];
    accent: string;
    assetQueries: string[];
    interactionType: LessonSpec["phases"][number]["interaction"]["type"];
    interactionPrompt: string;
    completionEvent: string;
    choices?: string[];
    answerIndex?: number;
    teacherNote: string;
  }>;
  safetyFlags: Array<{ phaseIndex: number; issue: string; adjustment: string; severity: "review" | "adjusted" | "blocked" }>;
};

function credentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as Record<string, string>;
  return parsed;
}

function makeClient() {
  const project = process.env.GCP_PROJECT;
  if (!project) return null;
  return new GoogleGenAI({
    vertexai: true,
    project,
    location: process.env.GCP_LOCATION || "us-central1",
    googleAuthOptions: credentials() ? { credentials: credentials() } : undefined,
  });
}

const promptPrefix = `You are the curriculum architect inside Clascade, a teacher-controlled interactive lesson engine.
Create a structured lesson specification, never rendering code. Choose cinematic_timeline for chronological narratives, scale_journey for systems explored at impossible scale, or parameter_sandbox for predict-and-test science and math.
Write 3 to 6 focused phases. Every phase needs a measurable objective, concise narration, one interaction, a teacher-only talking point, asset search queries, and a camera move from the allowed schema.
Adapt sensitive material for the requested grade. Add a safety flag whenever the student's role or presentation needs adjustment.
Use calm, precise classroom language. Do not invent citations. Citations are added by the grounding stage.`;

export async function generateLesson(description: string, sourceText?: string): Promise<{ lesson: LessonSpec; mode: "vertex" | "demo"; warning?: string }> {
  const ai = makeClient();
  if (!ai) {
    return { lesson: demoLesson(description), mode: "demo", warning: "Vertex credentials are not configured. Generated a complete local lesson fixture instead." };
  }

  try {
    const response = await ai.models.generateContent({
      model: process.env.VERTEX_MODEL || "gemini-2.5-flash",
      contents: `${promptPrefix}\n\nTeacher request:\n${description}\n\nExtracted source material:\n${sourceText?.slice(0, 40000) || "No uploaded source. Build from the teacher request."}`,
      config: {
        temperature: 0.45,
        responseMimeType: "application/json",
        responseJsonSchema: lessonResponseSchema,
      },
    });
    const raw = JSON.parse(response.text || "{}") as RawLesson;
    return { lesson: normalizeLesson(raw), mode: "vertex" };
  } catch (error) {
    const warning = error instanceof Error ? error.message : "Vertex request failed";
    return { lesson: demoLesson(description), mode: "demo", warning };
  }
}

function normalizeLesson(raw: RawLesson): LessonSpec {
  const lessonId = randomUUID();
  const phases = raw.phases.map((phase, index) => ({
    phaseId: `${lessonId}-${index + 1}`,
    beatTitle: phase.beatTitle,
    learningObjective: phase.learningObjective,
    narration: phase.narration,
    durationMinutes: Math.max(1, Math.min(20, phase.durationMinutes)),
    scene: {
      environment: phase.environment,
      cameraMove: phase.cameraMove,
      accent: phase.accent || "#c4614f",
      assetQueries: (phase.assetQueries || []).slice(0, 6),
    },
    interaction: {
      type: phase.interactionType,
      prompt: phase.interactionPrompt,
      completionEvent: phase.completionEvent,
      choices: phase.choices,
      answerIndex: phase.answerIndex,
    },
    claims: [],
    teacherNote: phase.teacherNote,
  }));

  return lessonSpecSchema.parse({
    version: "1.0",
    lessonId,
    title: raw.title,
    subject: raw.subject,
    gradeLevel: raw.gradeLevel,
    template: raw.template,
    status: "review",
    summary: raw.summary,
    createdAt: new Date().toISOString(),
    phases,
    safetyReport: {
      flags: raw.safetyFlags.map((flag, index) => ({
        id: `${lessonId}-safety-${index + 1}`,
        phaseId: phases[Math.max(0, Math.min(phases.length - 1, flag.phaseIndex))]?.phaseId,
        issue: flag.issue,
        adjustment: flag.adjustment,
        severity: flag.severity,
        teacherApproved: false,
      })),
    },
  });
}

function demoLesson(description: string): LessonSpec {
  const base = structuredClone(sampleLessons[1]);
  base.lessonId = randomUUID();
  base.title = description.trim().length > 8 ? description.trim().replace(/^make (me )?(a )?/i, "").slice(0, 64) : "New interactive lesson";
  base.status = "review";
  delete base.classCode;
  base.createdAt = new Date().toISOString();
  return base;
}
