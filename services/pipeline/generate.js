#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { generateSpec } from './src/generateSpec.js';

// CLI: turn a lesson description into a validated Lesson Spec JSON.
//   node generate.js "make a grade 7 lesson on the water cycle"
//   node generate.js "grade 5 solar system" --out lesson.json
async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outFile = outIdx !== -1 ? args[outIdx + 1] : null;
  const description = args
    .filter((_, i) => outIdx === -1 || (i !== outIdx && i !== outIdx + 1))
    .join(' ')
    .trim();

  if (!description) {
    console.error('Usage: node generate.js "<lesson description>" [--out lesson.json]');
    process.exit(1);
  }

  console.error(`Generating Lesson Spec for: "${description}" ...`);
  const { spec, attempts } = await generateSpec(description);
  console.error(`✓ Valid spec (${spec.phases.length} rooms, ${attempts} attempt${attempts > 1 ? 's' : ''}).`);

  const json = JSON.stringify(spec, null, 2);
  if (outFile) {
    writeFileSync(outFile, json + '\n');
    console.error(`Written to ${outFile}`);
  } else {
    process.stdout.write(json + '\n');
  }
}

main().catch((err) => {
  console.error('\n✗ ' + err.message);
  process.exit(1);
});
