import assert from "node:assert/strict";
import test from "node:test";
import { sampleLessons } from "../src/lib/fixtures.ts";
import { lessonSpecSchema } from "../src/lib/lesson-spec.ts";

test("lesson fixtures satisfy the shared renderer contract", () => {
  for (const lesson of sampleLessons) {
    assert.equal(lessonSpecSchema.safeParse(lesson).success, true, lesson.title);
  }
});

test("published lessons have a six-character class code", () => {
  const published = sampleLessons.filter((lesson) => lesson.status === "published");
  assert.ok(published.length > 0);
  for (const lesson of published) assert.equal(lesson.classCode?.length, 6);
});

test("every phase declares renderer-safe assets and completion events", () => {
  for (const lesson of sampleLessons) {
    for (const phase of lesson.phases) {
      assert.ok(phase.scene.assetQueries.length > 0);
      assert.ok(phase.interaction.completionEvent.length > 3);
    }
  }
});

test("Limit Drop is packaged as a generated playable lesson", () => {
  const lesson = sampleLessons.find((item) => item.lessonId === "limit-drop");
  assert.ok(lesson);
  assert.equal(lesson.template, "parameter_sandbox");
  assert.equal(lesson.gamePath, "/games/limit-drop");
  assert.equal(lesson.phases.length, 6);
});
