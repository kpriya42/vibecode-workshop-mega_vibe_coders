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
  assert.match(html, /<time>14:00<\/time><span>1 of 2 spots left · <a [^>]*>jwosylu</);
  assert.equal(saved(dir)[0].browser, id);
  // The kept browser id still identifies the booker after restart: the same browser rebooking the slot is refused as taken.
  assert.equal((await second.book(valid, { cookie: `browser=${id}` })).status, 409);
});

test('the booking is in the file when the success response arrives', async t => {
  const dir = tempDir(t);
  const { book } = await server(t, dir);
  assert.equal((await book(valid)).status, 303);
  assert.deepEqual({ ...saved(dir)[0], browser: 'x' },
    { table: 2, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'jwosylu', browser: 'x', joined: [] });
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

const A = 'browser=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'browser=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'browser=cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const post = (origin, path, fields, cookie) => fetch(origin + path, {
  method: 'POST', redirect: 'manual', headers: { cookie }, body: new URLSearchParams(fields),
});
const slot14 = { table: '2', time: '14:00' };
const slotText = async (origin, cookie) => (await (await fetch(`${origin}/table/2`, { headers: { cookie } })).text())
  .match(/<li class="slot \w+"><time>14:00<\/time>.*?<\/li>/)[0];

test('a join survives a restart and only the joining browser can still leave', async t => {
  const dir = tempDir(t);
  const first = await server(t, dir);
  assert.equal((await first.book(valid, { cookie: A })).status, 303);
  assert.equal((await post(first.origin, '/join', { ...slot14, login: 'ben42' }, B)).status, 303);
  await first.close();

  const second = await server(t, dir);
  const html = await slotText(second.origin, B);
  assert.match(html, /jwosylu.*ben42/);
  assert.match(html, /Leave as ben42/);
  assert.equal((await post(second.origin, '/leave', { ...slot14, login: 'ben42' }, C)).status, 403);
  assert.equal((await post(second.origin, '/leave', { ...slot14, login: 'ben42' }, B)).status, 303);
  await second.close();

  const third = await server(t, dir);
  assert.doesNotMatch(await slotText(third.origin, B), /ben42/);
  assert.deepEqual(saved(dir)[0].joined, []);
});

test('a cancel survives a restart and only the booking browser can cancel after one', async t => {
  const dir = tempDir(t);
  const first = await server(t, dir);
  assert.equal((await first.book(valid, { cookie: A })).status, 303);
  await first.close();

  const second = await server(t, dir);
  assert.match(await slotText(second.origin, A), /Cancel booking/);
  assert.equal((await post(second.origin, '/cancel', slot14, B)).status, 403);
  assert.equal((await post(second.origin, '/cancel', slot14, A)).status, 303);
  await second.close();

  const third = await server(t, dir);
  assert.match(await slotText(third.origin, A), /Free/);
  assert.deepEqual(saved(dir), []);
});

test('refused joins, leaves and cancels leave the file unchanged', async t => {
  const dir = tempDir(t);
  const { origin, book } = await server(t, dir);
  assert.equal((await book(valid, { cookie: A })).status, 303);
  assert.equal((await post(origin, '/join', { ...slot14, login: 'ben42' }, B)).status, 303);
  const before = readFileSync(join(dir, 'bookings.json'), 'utf8');
  const refused = [
    ['/join', { ...slot14, login: 'carol' }, C], // full
    ['/join', { table: '2', time: '15:00', login: 'carol' }, C], // free slot
    ['/leave', { ...slot14, login: 'ben42' }, C], // other browser
    ['/leave', { ...slot14, login: 'nobody' }, B], // not in the game
    ['/cancel', slot14, B], // not the booker
    ['/cancel', { table: '2', time: '15:00' }, A], // free slot
  ];
  for (const [path, fields, cookie] of refused) {
    const status = (await post(origin, path, fields, cookie)).status;
    assert.ok(status >= 400 && status < 500, `${path} ${JSON.stringify(fields)} gave ${status}`);
    assert.equal(readFileSync(join(dir, 'bookings.json'), 'utf8'), before, `${path} changed the file`);
  }
});

test('a failed save of a join answers 500 and forgets the join', async t => {
  const dir = tempDir(t);
  const { origin, book } = await server(t, dir);
  assert.equal((await book(valid, { cookie: A })).status, 303);
  mkdirSync(join(dir, 'bookings.json.tmp'));
  assert.equal((await post(origin, '/join', { ...slot14, login: 'ben42' }, B)).status, 500);
  assert.doesNotMatch(await slotText(origin, B), /ben42/);
});
