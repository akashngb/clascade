import { generateContent } from './vertexClient.js';
import { responseSchema, validateSpec, finalizeSpec, INTERACTION_TYPES } from './lessonSpecSchema.js';

const SYSTEM = `You are the SlideQuest lesson designer. You convert a teacher's lesson
description (or slide text) into a structured, curriculum-grounded Lesson Spec that a
hand-built 3D renderer will play as a walkable, room-by-room experience.

Rules:
- Produce 4-6 phases. Each phase is one concept beat = one room the student walks through.
- interaction.type must be one of: ${INTERACTION_TYPES.join(', ')}.
    - "cinematic": the student looks around and reads; no task.
    - "explore": the student collects N key items; set interaction.itemCount (2-6).
    - "quiz": a single multiple-choice checkpoint; fill interaction.quiz.
- Narration is spoken to the student: warm, concrete, 2-4 sentences, grade-appropriate.
- Each room.accent is a #RRGGBB hex colour that fits the concept; room.theme is a short
  scene description (e.g. "cross-section of a leaf", "orbiting the sun").
- Be factually accurate. Do not invent citations. Keep it age-appropriate for the grade.`;

function buildPrompt(description, priorErrors) {
  let p = `Design a Lesson Spec for this request:\n\n"${description}"\n\nReturn ONLY the JSON object.`;
  if (priorErrors?.length) {
    p += `\n\nThe previous attempt failed validation. Fix these issues:\n- ${priorErrors.join('\n- ')}`;
  }
  return p;
}

/**
 * Generate a validated Lesson Spec from a natural-language description.
 * Retries up to `maxRetries` times, feeding validator errors back to the model.
 */
export async function generateSpec(description, { maxRetries = 3 } = {}) {
  let errors = [];
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const text = await generateContent({
      system: SYSTEM,
      prompt: buildPrompt(description, errors),
      responseSchema,
      temperature: 0.5,
    });

    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      errors = ['Output was not valid JSON.'];
      continue;
    }

    const result = validateSpec(raw);
    if (result.valid) {
      return { spec: finalizeSpec(raw), attempts: attempt };
    }
    errors = result.errors;
  }
  throw new Error(`Failed to generate a valid Lesson Spec after ${maxRetries} attempts.\nLast errors:\n- ${errors.join('\n- ')}`);
}

export default generateSpec;
