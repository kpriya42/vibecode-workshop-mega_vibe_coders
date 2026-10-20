import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.mjs';

// Data lives only in a fresh directory under the OS temp dir, never in the repo or the real home.
function tempDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'vc-persist-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// 10:00Z on 20 Oct 2026 is 12:00 in Berlin.
async function server(t, dataDir) {
  const app = createApp({ revision: 'test', now: () => new Date('2026-10-20T10:00:00Z'), dataDir });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const close = () => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); });
  t.after(() => app.listening && close());
  const origin = `http://127.0.0.1:${app.address().port}`;
  const book = (fields, headers = {}) => fetch(`${origin}/book`, {
    method: 'POST', redirect: 'manual', headers, body: new URLSearchParams(fields),
  });
  return { origin, book, close };
}

const valid = { table: '2', time: '14:00', login: 'jwosylu', spots: '2', players: '1' };
const saved = dir => JSON.parse(readFileSync(join(dir, 'bookings.json'), 'utf8'));

test('a booking survives a restart with the same login and browser id', async t => {
  const dir = tempDir(t);
  const first = await server(t, dir);
  const response = await first.book(valid);
  assert.equal(response.status, 303);
  const id = response.headers.get('set-cookie').match(/^browser=([^;]+)/)[1];
  await first.close();

  const second = await server(t, dir);
  const html = await (await fetch(`${second.origin}/table/2`)).text();
  assert.match(html, /<time>14:00<\/time><span>1 of 2 spots left · jwosylu/);
  assert.equal(saved(dir)[0].browser, id);
  // The kept browser id still identifies the booker after restart: the same browser rebooking the slot is refused as taken.
  assert.equal((await second.book(valid, { cookie: `browser=${id}` })).status, 409);
});

test('the booking is in the file when the success response arrives', async t => {
  const dir = tempDir(t);
  const { book } = await server(t, dir);
  assert.equal((await book(valid)).status, 303);
  assert.deepEqual({ ...saved(dir)[0], browser: 'x' },
    { table: 2, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'jwosylu', browser: 'x' });
});

test('a refused request writes nothing', async t => {
  const dir = join(tempDir(t), 'data');
  const { book } = await server(t, dir);
  assert.equal((await book({ ...valid, time: '09:00' })).status, 409);
  assert.equal((await book({ ...valid, table: '3' })).status, 400);
  assert.equal(existsSync(dir), false);
});

test('a missing directory starts empty and is created private on first save', async t => {
  const dir = join(tempDir(t), 'nested', 'data');
  const { origin, book } = await server(t, dir);
  assert.doesNotMatch(await (await fetch(`${origin}/table/2`)).text(), /spots left/);
  assert.equal((await book(valid)).status, 303);
  assert.equal(statSync(dir).mode & 0o777, 0o700);
  assert.equal(statSync(join(dir, 'bookings.json')).mode & 0o777, 0o600);
  assert.equal(saved(dir).length, 1);
});

test('an empty file means no bookings', async t => {
  const dir = tempDir(t);
  writeFileSync(join(dir, 'bookings.json'), '');
  const { book } = await server(t, dir);
  assert.equal((await book(valid)).status, 303);
  assert.equal(saved(dir).length, 1);
});

test('a damaged file stops the app with a clear message and is left untouched', t => {
  for (const content of ['{"table": 1', '{"table": 1}', 'null']) {
    const dir = tempDir(t);
    writeFileSync(join(dir, 'bookings.json'), content);
    assert.throws(() => createApp({ dataDir: dir }), /bookings\.json.*(not valid JSON|not a list)/);
    assert.equal(readFileSync(join(dir, 'bookings.json'), 'utf8'), content);
  }
});

test('a failed save leaves the old file whole, answers 500 and forgets the change', async t => {
  const dir = tempDir(t);
  const { origin, book } = await server(t, dir);
  assert.equal((await book(valid)).status, 303);
  const before = readFileSync(join(dir, 'bookings.json'), 'utf8');
  mkdirSync(join(dir, 'bookings.json.tmp')); // the temp file cannot be written, like a crash before rename
  const failed = await book({ ...valid, time: '15:00' });
  assert.equal(failed.status, 500);
  assert.equal(readFileSync(join(dir, 'bookings.json'), 'utf8'), before);
  assert.match((await (await fetch(`${origin}/table/2`)).text()), /<time>15:00<\/time><span>Free/);
  rmSync(join(dir, 'bookings.json.tmp'), { recursive: true });
  assert.equal((await book({ ...valid, time: '15:00' })).status, 303);
});

test('concurrent bookings on different slots are both saved', async t => {
  const dir = tempDir(t);
  const { book } = await server(t, dir);
  const statuses = await Promise.all(['14:00', '14:30', '15:00'].map(time => book({ ...valid, time }).then(r => r.status)));
  assert.deepEqual(statuses, [303, 303, 303]);
  assert.deepEqual(saved(dir).map(b => b.start.slice(11)).sort(), ['14:00', '14:30', '15:00']);
});
