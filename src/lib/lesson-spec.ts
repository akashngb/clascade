import { z } from "zod";

export const templateSchema = z.enum([
  "cinematic_timeline",
  "scale_journey",
  "parameter_sandbox",
]);

export const claimSchema = z.object({
  id: z.string(),
  claim: z.string().min(8),
  source: z.string().url(),
  sourceTitle: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  teacherApproved: z.boolean(),
});

export const safetyFlagSchema = z.object({
  id: z.string(),
  phaseId: z.string(),
  issue: z.string(),
  adjustment: z.string(),
  severity: z.enum(["review", "adjusted", "blocked"]),
  teacherApproved: z.boolean(),
});

export const phaseSchema = z.object({
  phaseId: z.string(),
  beatTitle: z.string().min(2),
  learningObjective: z.string().min(8),
  narration: z.string().min(12),
  durationMinutes: z.number().min(1).max(20),
  scene: z.object({
    environment: z.string(),
    cameraMove: z.enum([
      "date_title_cinematic",
      "crane_down_to_street",
      "follow_actor",
      "slow_motion_orbit",
      "cutaway",
      "first_person_walk",
      "scale_dive",
      "orbit_subject",
      "sandbox_wide",
    ]),
    accent: z.string(),
    assetQueries: z.array(z.string()).max(6),
  }),
  interaction: z.object({
    type: z.enum(["explore", "objective", "quiz", "sandbox_params", "dialogue", "none"]),
    prompt: z.string(),
    completionEvent: z.string(),
    choices: z.array(z.string()).optional(),
    answerIndex: z.number().int().nonnegative().optional(),
  }),
  claims: z.array(claimSchema),
  teacherNote: z.string(),
});

export const lessonSpecSchema = z.object({
  version: z.literal("1.0"),
  lessonId: z.string(),
  title: z.string().min(3),
  subject: z.string(),
  gradeLevel: z.number().int().min(1).max(12),
  template: templateSchema,
  status: z.enum(["draft", "review", "published"]),
  summary: z.string(),
  createdAt: z.string(),
  classCode: z.string().length(6).optional(),
  phases: z.array(phaseSchema).min(3).max(10),
  safetyReport: z.object({ flags: z.array(safetyFlagSchema) }),
});

export type LessonSpec = z.infer<typeof lessonSpecSchema>;
export type LessonPhase = z.infer<typeof phaseSchema>;

export const lessonResponseSchema = {
  type: "object",
  required: ["title", "subject", "gradeLevel", "template", "summary", "phases", "safetyFlags"],
  properties: {
    title: { type: "string" },
    subject: { type: "string" },
    gradeLevel: { type: "integer" },
    template: { type: "string", enum: templateSchema.options },
    summary: { type: "string" },
    phases: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        required: ["beatTitle", "learningObjective", "narration", "durationMinutes", "environment", "cameraMove", "accent", "assetQueries", "interactionType", "interactionPrompt", "completionEvent", "teacherNote"],
        properties: {
          beatTitle: { type: "string" },
          learningObjective: { type: "string" },
          narration: { type: "string" },
          durationMinutes: { type: "number" },
          environment: { type: "string" },
          cameraMove: { type: "string", enum: ["date_title_cinematic", "crane_down_to_street", "follow_actor", "slow_motion_orbit", "cutaway", "first_person_walk", "scale_dive", "orbit_subject", "sandbox_wide"] },
          accent: { type: "string" },
          assetQueries: { type: "array", items: { type: "string" } },
          interactionType: { type: "string", enum: ["explore", "objective", "quiz", "sandbox_params", "dialogue", "none"] },
          interactionPrompt: { type: "string" },
          completionEvent: { type: "string" },
          choices: { type: "array", items: { type: "string" } },
          answerIndex: { type: "integer" },
          teacherNote: { type: "string" },
        },
      },
    },
    safetyFlags: {
      type: "array",
      items: {
        type: "object",
        required: ["phaseIndex", "issue", "adjustment", "severity"],
        properties: {
          phaseIndex: { type: "integer" },
          issue: { type: "string" },
          adjustment: { type: "string" },
          severity: { type: "string", enum: ["review", "adjusted", "blocked"] },
        },
      },
    },
  },
} as const;
