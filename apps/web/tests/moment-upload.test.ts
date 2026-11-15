import assert from 'node:assert/strict';
import { createMomentUpload } from '../src/lib/moment-upload.ts';
let release: (value: string) => void = () => {};
let uploads = 0, saves = 0, done = 0;
const states: string[] = [];
const failures: unknown[] = [];
const run = createMomentUpload({
  upload: () => { uploads++; return new Promise<string>((resolve) => { release = resolve; }); },
  save: async (url) => { assert.equal(url, '/uploaded.jpg'); if (++saves === 1) throw new Error('save interrupted'); },
  state: (value) => states.push(value), error: (error) => failures.push(error), done: () => done++,
});
const first = run();
await run();
assert.equal(uploads, 1, 'Duplicate taps never start duplicate uploads');
assert.deepEqual(states, ['uploading'], 'Pending state appears before network completion');
release('/uploaded.jpg'); await first;
assert.deepEqual(states, ['uploading', 'error']);
assert.equal(done, 0, 'A failed save never reports completion');
await run();
assert.equal(uploads, 1, 'Retry reuses the successfully uploaded file');
assert.equal(saves, 2);
assert.equal(done, 1);
assert.deepEqual(states, ['uploading', 'error', 'uploading', 'done']);
assert.equal(failures.length, 1);
console.log('PASS: immediate pending state, double-tap protection, failed-save retry and truthful completion.');
