import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

// 10:00Z on 20 Oct 2026 is 12:00 in Berlin: slots before 12:00 have ended.
async function server(t, bookings = []) {
  const app = createApp({ revision: 'test', now: () => new Date('2026-10-20T10:00:00Z'), bookings });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${app.address().port}`;
  const book = (fields, headers = {}) => fetch(`${origin}/book`, {
    method: 'POST', redirect: 'manual', headers,
    body: new URLSearchParams(fields),
  });
  return { origin, bookings, book };
}

const valid = { table: '2', time: '14:00', login: 'jwosylu', spots: '2', players: '1' };
const slot = (html, time) => html.match(new RegExp(`<li class="slot (\\w+)"><time>${time}</time>(.*?)</li>`)).slice(1);

test('singles booking with 1 player stores the booking and shows 1 of 2 spots left', async t => {
  const { origin, bookings, book } = await server(t);
  const response = await book(valid);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/table/2?booked=14:00');
  assert.equal(bookings.length, 1);
  assert.deepEqual({ ...bookings[0], browser: typeof bookings[0].browser },
    { table: 2, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'jwosylu', browser: 'string' });
  const html = await (await fetch(origin + response.headers.get('location'))).text();
  const [status, text] = slot(html, '14:00');
  assert.equal(status, 'open');
  assert.match(text, /1 of 2 spots left/);
  assert.match(text, /jwosylu/);
  assert.match(html, /role="status"[^>]*>[^<]*Booked 14:00/);
});

test('doubles booking with 4 players shows the slot full', async t => {
  const { origin, book } = await server(t);
  assert.equal((await book({ ...valid, spots: '4', players: '4' })).status, 303);
  const html = await (await fetch(`${origin}/table/2`)).text();
  assert.equal(slot(html, '14:00')[0], 'full');
});

test('reloading the success page does not book again', async t => {
  const { origin, bookings, book } = await server(t);
  const location = (await book(valid)).headers.get('location');
  await fetch(origin + location);
  await fetch(origin + location);
  assert.equal(bookings.length, 1);
});

test('the browser gets an unguessable HttpOnly id that is stored but never shown', async t => {
  const { origin, bookings, book } = await server(t);
  const response = await book(valid);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /^browser=[0-9a-f-]{36};/);
  assert.match(cookie, /HttpOnly/);
  const id = cookie.match(/^browser=([^;]+)/)[1];
  assert.equal(bookings[0].browser, id);
  const html = await (await fetch(`${origin}/table/2`, { headers: { cookie: `browser=${id}` } })).text();
  assert.ok(!html.includes(id));
  // A returning browser keeps its id.
  const again = await book({ ...valid, time: '15:00' }, { cookie: `browser=${id}` });
  assert.equal(again.status, 303);
  assert.equal(bookings[1].browser, id);
});

test('two browsers get different ids', async t => {
  const { book } = await server(t);
  const a = (await book(valid)).headers.get('set-cookie');
  const b = (await book({ ...valid, time: '15:00' })).headers.get('set-cookie');
  assert.notEqual(a.split(';')[0], b.split(';')[0]);
});

test('normal logins are accepted', async t => {
  const { bookings, book } = await server(t);
  for (const [i, login] of ['jwosylu', 'ben42', 'j-doe'].entries()) {
    const response = await book({ ...valid, login, time: `1${3 + i}:00` });
    assert.equal(response.status, 303, login);
  }
  assert.deepEqual(bookings.map(b => b.login), ['jwosylu', 'ben42', 'j-doe']);
});

test('refused bookings get a clear 4xx message and book nothing', async t => {
  const cases = [
    [{ login: '' }, /login/i],
    [{ login: '   ' }, /login/i],
    [{ login: 'jw osylu' }, /login/i],
    [{ login: '<script>alert(1)</script>' }, /login/i],
    [{ time: '10:00' }, /ended/i],
    [{ time: '08:30' }, /opening hours|not a slot/i],
    [{ time: '18:00' }, /opening hours|not a slot/i],
    [{ time: '14:15' }, /opening hours|not a slot/i],
    [{ time: 'noon' }, /time/i],
    [{ table: '3' }, /table/i],
    [{ table: '' }, /table/i],
    [{ spots: '3' }, /spots/i],
    [{ spots: '' }, /spots/i],
    [{ players: '0' }, /fill/i],
    [{ players: '3' }, /fill/i],
    [{ spots: '4', players: '5' }, /fill/i],
    [{ players: '1.5' }, /fill/i],
    [{ players: 'x' }, /fill/i],
  ];
  const { bookings, book } = await server(t);
  for (const [change, message] of cases) {
    const response = await book({ ...valid, ...change });
    const label = JSON.stringify(change);
    assert.ok(response.status >= 400 && response.status < 500, `${label} → ${response.status}`);
    const html = await response.text();
    assert.match(html, message, label);
    assert.doesNotMatch(html, /<script>/, label);
  }
  for (const missing of Object.keys(valid)) {
    const fields = { ...valid };
    delete fields[missing];
    const response = await book(fields);
    assert.equal(response.status, 400, `missing ${missing}`);
  }
  assert.equal(bookings.length, 0);
});

test('an already booked slot is refused', async t => {
  const { bookings, book } = await server(t, [{ table: 2, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'ben42', browser: 'x' }]);
  const response = await book(valid);
  assert.equal(response.status, 409);
  assert.match(await response.text(), /already booked/i);
  assert.equal(bookings.length, 1);
});

test('the same time on the other table is still bookable', async t => {
  const { book } = await server(t, [{ table: 1, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'ben42', browser: 'x' }]);
  assert.equal((await book(valid)).status, 303);
});

test('two simultaneous requests for one slot make exactly one booking', async t => {
  const { bookings, book } = await server(t);
  const statuses = (await Promise.all([book(valid), book({ ...valid, login: 'ben42' })])).map(r => r.status).sort();
  assert.deepEqual(statuses, [303, 409]);
  assert.equal(bookings.length, 1);
});

test('an oversized body is refused and the app keeps serving', async t => {
  const { origin, bookings, book } = await server(t);
  const response = await book({ ...valid, login: 'a'.repeat(1_000_000) }).catch(error => error);
  if (response instanceof Response) assert.equal(response.status, 413);
  assert.equal(bookings.length, 0);
  assert.equal((await fetch(`${origin}/api/health`)).status, 200);
  assert.equal((await book(valid)).status, 303);
});

test('the table page offers a booking form with only free, not-ended slots', async t => {
  const { origin } = await server(t, [{ table: 2, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'ben42', browser: 'x' }]);
  const html = await (await fetch(`${origin}/table/2`)).text();
  assert.match(html, /<form method="post" action="\/book"/);
  assert.match(html, /name="table" value="2"/);
  const options = [...html.matchAll(/<option value="(\d\d:\d\d)"/g)].map(m => m[1]);
  assert.equal(options[0], '12:00');
  assert.ok(!options.includes('11:30'));
  assert.ok(!options.includes('14:00'));
  assert.ok(options.includes('14:30'));
});

test('other writes are still 405', async t => {
  const { origin } = await server(t);
  for (const [method, path] of [['POST', '/'], ['POST', '/table/1'], ['PUT', '/book'], ['DELETE', '/book']]) {
    const response = await fetch(origin + path, { method });
    assert.equal(response.status, 405, `${method} ${path}`);
  }
});

test('a client that disconnects mid-body does not crash the app', async t => {
  const { origin, bookings, book } = await server(t);
  const { connect } = await import('node:net');
  const socket = connect(new URL(origin).port, '127.0.0.1');
  await new Promise(resolve => socket.on('connect', resolve));
  socket.write('POST /book HTTP/1.1\r\nHost: x\r\nContent-Type: application/x-www-form-urlencoded\r\nContent-Length: 1000\r\n\r\ntable=2');
  await new Promise(resolve => setTimeout(resolve, 50));
  socket.destroy();
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal((await fetch(`${origin}/api/health`)).status, 200);
  assert.equal((await book(valid)).status, 303);
  assert.equal(bookings.length, 1);
});
