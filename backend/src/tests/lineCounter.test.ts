import test from 'node:test';
import assert from 'node:assert';
import { LineCounter } from '../credits/lineCounter.js';

test('LineCounter: counts lines correctly with CRLF and LF', () => {
  const sampleLF = 'line 1\nline 2\nline 3';
  const sampleCRLF = 'line 1\r\nline 2\r\nline 3';

  assert.strictEqual(LineCounter.countLines(sampleLF), 3);
  assert.strictEqual(LineCounter.countLines(sampleCRLF), 3);
  assert.strictEqual(LineCounter.countLines(''), 0);
  assert.strictEqual(LineCounter.countLines('single line'), 1);
});

test('LineCounter: extracts slice up to 500 lines', () => {
  const lines = Array.from({ length: 600 }, (_, i) => `Line ${i + 1}`).join('\n');
  const result = LineCounter.extractUpTo(lines, 500);

  assert.strictEqual(result.linesCount, 500);
  assert.strictEqual(result.hasMore, true);
  assert.strictEqual(LineCounter.countLines(result.remainingText), 100);
});

test('LineCounter: correctly identifies when under 500 lines', () => {
  const lines = Array.from({ length: 150 }, (_, i) => `Code line ${i + 1}`).join('\n');
  const result = LineCounter.extractUpTo(lines, 500);

  assert.strictEqual(result.linesCount, 150);
  assert.strictEqual(result.hasMore, false);
  assert.strictEqual(result.remainingText, '');
});
