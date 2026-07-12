// The Lesson Spec IR — the contract between the pipeline and the renderer.
// Kept deliberately small: content + pedagogy, never rendering code (CLAUDE.md
// §3). `responseSchema` constrains Gemini's structured output; `validateSpec`
// is the gate — a spec that fails never reaches the renderer.

// Interaction types the renderer can currently play.
export const INTERACTION_TYPES = ['cinematic', 'explore', 'quiz'];

// Gemini structured-output schema (Vertex uses an OpenAPI subset, UPPERCASE types).
export const responseSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    subject: { type: 'STRING' },
    gradeLevel: { type: 'INTEGER' },
    summary: { type: 'STRING' },
    phases: {
      type: 'ARRAY',
      minItems: 3,
      maxItems: 7,
      items: {
        type: 'OBJECT',
        properties: {
          beatTitle: { type: 'STRING' },
          learningObjective: { type: 'STRING' },
          narration: { type: 'STRING' },
          interaction: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING', enum: INTERACTION_TYPES },
              objective: { type: 'STRING' },
              itemCount: { type: 'INTEGER' },
              quiz: {
                type: 'OBJECT',
                nullable: true,
                properties: {
                  question: { type: 'STRING' },
                  choices: { type: 'ARRAY', items: { type: 'STRING' } },
                  answerIndex: { type: 'INTEGER' },
                },
                required: ['question', 'choices', 'answerIndex'],
              },
            },
            required: ['type', 'objective'],
          },
          room: {
            type: 'OBJECT',
            properties: {
              theme: { type: 'STRING' },
              accent: { type: 'STRING' },
            },
            required: ['theme', 'accent'],
          },
        },
        required: ['beatTitle', 'learningObjective', 'narration', 'interaction', 'room'],
      },
    },
  },
  required: ['title', 'subject', 'gradeLevel', 'phases'],
};

const isHex = (s) => typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);

// Lightweight validator (no dependency). Returns { valid, errors }.
export function validateSpec(spec) {
  const errors = [];
  const req = (cond, msg) => {
    if (!cond) errors.push(msg);
  };

  req(spec && typeof spec === 'object', 'spec must be an object');
  if (!spec || typeof spec !== 'object') return { valid: false, errors };

  req(typeof spec.title === 'string' && spec.title.length > 0, 'title must be a non-empty string');
  req(typeof spec.subject === 'string' && spec.subject.length > 0, 'subject must be a non-empty string');
  req(Number.isInteger(spec.gradeLevel), 'gradeLevel must be an integer');
  req(Array.isArray(spec.phases) && spec.phases.length >= 3, 'phases must be an array of at least 3');

  (spec.phases || []).forEach((p, i) => {
    const path = `phases[${i}]`;
    req(typeof p.beatTitle === 'string' && p.beatTitle.length > 0, `${path}.beatTitle required`);
    req(typeof p.learningObjective === 'string' && p.learningObjective.length > 0, `${path}.learningObjective required`);
    req(typeof p.narration === 'string' && p.narration.length > 0, `${path}.narration required`);
    req(p.interaction && typeof p.interaction === 'object', `${path}.interaction required`);
    if (p.interaction) {
      req(INTERACTION_TYPES.includes(p.interaction.type), `${path}.interaction.type must be one of ${INTERACTION_TYPES.join(', ')}`);
      req(typeof p.interaction.objective === 'string', `${path}.interaction.objective required`);
      if (p.interaction.type === 'quiz') {
        const q = p.interaction.quiz;
        req(q && typeof q.question === 'string', `${path}.interaction.quiz.question required for quiz`);
        req(q && Array.isArray(q.choices) && q.choices.length >= 2, `${path}.interaction.quiz.choices needs >= 2 options`);
        req(q && Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < (q.choices?.length ?? 0), `${path}.interaction.quiz.answerIndex out of range`);
      }
    }
    req(p.room && isHex(p.room.accent), `${path}.room.accent must be a #RRGGBB hex colour`);
  });

  return { valid: errors.length === 0, errors };
}

// Finalise a validated raw spec into the renderer's Lesson Spec shape:
// stable ids, phaseIds, status. Rooms get laid out by the renderer from phase order.
export function finalizeSpec(raw) {
  const slug = raw.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return {
    lessonId: `${slug}-${Date.now().toString(36)}`,
    title: raw.title,
    subject: raw.subject,
    gradeLevel: raw.gradeLevel,
    template: 'scale_journey',
    status: 'draft',
    phases: raw.phases.map((p, i) => ({
      phaseId: `p${i + 1}-${(p.beatTitle || 'beat').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`,
      beatTitle: p.beatTitle,
      learningObjective: p.learningObjective,
      narration: p.narration,
      environment: 'nucleus',
      interaction: p.interaction,
      room: p.room,
      hint: p.interaction.objective,
    })),
  };
}

export default responseSchema;
