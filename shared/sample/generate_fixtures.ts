/**
 * Generates the JSON fixture file for compiler tests from the TypeScript mockup.
 *
 * Usage:  bun shared/sample/generate_fixtures.ts
 *
 * Output: compiler/tests/fixtures/sample_mockup.json
 */

import * as path from 'path';
import * as fs from 'fs';
import { mockupWorkflow } from './mockup';

const FIXTURES_DIR = path.resolve(__dirname, '../../compiler/tests/fixtures');
const FILENAME = 'sample_mockup.json';

function main() {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }

  const filepath = path.join(FIXTURES_DIR, FILENAME);
  fs.writeFileSync(filepath, JSON.stringify(mockupWorkflow, null, 4) + '\n');
  console.log(`  wrote ${FILENAME}`);
  console.log(`\nGenerated fixture in ${FIXTURES_DIR}`);
}

main();
