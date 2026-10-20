import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

// 10:00Z on 20 Oct 2026 is 12:00 in Berlin: slots before 12:00 have ended.
const A = 'browser=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'browser=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'browser=cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const id = cookie => cookie.split('=')[1];

async function server(t, bookings = []) {
  const app = createApp({ revision: 'test', now: () => new Date('2026-10-20T10:00:00Z'), bookings });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${app.address().port}`;
  const post = (path, fields, cookie) => fetch(origin + path, {
    method: 'POST', redirect: 'manual', headers: cookie ? { cookie } : {},
    body: new URLSearchParams(fields),
  });
  const page = async (cookie, table = 2) => (await fetch(`${origin}/table/${table}`, { headers: cookie ? { cookie } : {} })).text();
  return { bookings, post, page };
}

const singles = (extra = {}) => ({ table: 2, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'jwosylu', browser: id(A), joined: [], ...extra });
const slot = (html, time) => html.match(new RegExp(`<li class="slot (\\w+)"><time>${time}</time>(.*?)</li>`)).slice(1);
const join = { table: '2', time: '14:00', login: 'ben42' };
const snapshot = bookings => JSON.stringify(bookings);

test('joining an open game takes one spot and the slot shows Full', async t => {
  const { bookings, post, page } = await server(t, [singles()]);
  const response = await post('/join', join, B);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/table/2?joined=14:00');
  assert.deepEqual(bookings[0].joined, [{ login: 'ben42', browser: id(B) }]);
  assert.equal(slot(await page(B), '14:00')[0], 'full');
  const html = await (await fetch(new URL(response.headers.get('location'), response.url))).text();
  assert.match(html, /role="status"[^>]*>[^<]*Joined 14:00/);
});

test('joining a doubles game shows one fewer spot left', async t => {
  const { post, page } = await server(t, [singles({ spots: 4 })]);
  assert.match(slot(await page(), '14:00')[1], /3 of 4 spots left/);
  assert.equal((await post('/join', join, B)).status, 303);
  assert.match(slot(await page(), '14:00')[1], /2 of 4 spots left/);
});

test('a first-time joiner gets a browser cookie', async t => {
  const { bookings, post } = await server(t, [singles()]);
  const response = await post('/join', join);
  assert.equal(response.status, 303);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /^browser=[0-9a-f-]{36};.*HttpOnly/);
  assert.equal(bookings[0].joined[0].browser, cookie.match(/^browser=([^;]+)/)[1]);
});

test('open games offer a join form; free, full and ended slots do not', async t => {
  const { page } = await server(t, [
    singles(),
    singles({ start: '2026-10-20T15:00', players: 2 }),
    singles({ start: '2026-10-20T11:00' }),
  ]);
  const html = await page();
  assert.match(slot(html, '14:00')[1], /action="\/join"/);
  for (const time of ['15:00', '11:00', '16:00']) assert.doesNotMatch(slot(html, time)[1], /action="\/join"/, time);
});

test('refused joins get a clear 4xx message and change nothing', async t => {
  const cases = [
    [{ login: '' }, 400, /login/i],
    [{ login: '   ' }, 400, /login/i],
    [{ login: 'ben 42' }, 400, /login/i],
    [{ login: '<script>alert(1)</script>' }, 400, /login/i],
    [{ login: 'jwosylu' }, 409, /already/i],
    [{ login: 'JWOSYLU' }, 409, /already/i],
    [{ time: '15:00' }, 409, /free|book it/i],
    [{ time: '11:00' }, 409, /ended/i],
    [{ time: '14:15' }, 400, /not a slot/i],
    [{ time: '12:60' }, 400, /not a slot/i],
    [{ time: '08:00' }, 400, /not a slot/i],
    [{ table: '3' }, 400, /table/i],
    [{ table: '1' }, 409, /free|book it/i],
  ];
  const { bookings, post } = await server(t, [singles({ spots: 4 }), singles({ start: '2026-10-20T11:00' })]);
  const before = snapshot(bookings);
  for (const [change, status, message] of cases) {
    const response = await post('/join', { ...join, ...change }, B);
    const label = JSON.stringify(change);
    assert.equal(response.status, status, label);
    const html = await response.text();
    assert.match(html, message, label);
    assert.match(html, /Not joined/, label);
    assert.doesNotMatch(html, /<script>/, label);
  }
  for (const missing of Object.keys(join)) {
    const fields = { ...join };
    delete fields[missing];
    assert.equal((await post('/join', fields, B)).status, 400, `missing ${missing}`);
  }
  assert.equal(snapshot(bookings), before);
});

test('joining a full game or the same login twice is refused', async t => {
  const { bookings, post } = await server(t, [singles({ spots: 4 })]);
  assert.equal((await post('/join', join, B)).status, 303);
  const twice = await post('/join', join, C);
  assert.equal(twice.status, 409);
  assert.match(await twice.text(), /already/i);
  assert.equal((await post('/join', { ...join, login: 'carl' }, C)).status, 303);
  assert.equal((await post('/join', { ...join, login: 'dora' }, C)).status, 303);
  const before = snapshot(bookings);
  const full = await post('/join', { ...join, login: 'emil' }, C);
  assert.equal(full.status, 409);
  assert.match(await full.text(), /full/i);
  assert.equal(snapshot(bookings), before);
});

test('simultaneous joins for the last spot make exactly one joiner', async t => {
  const { bookings, post } = await server(t, [singles()]);
  const logins = ['ben42', 'carl', 'dora', 'eve', 'finn'];
  const statuses = (await Promise.all(logins.map(login => post('/join', { ...join, login }, C)))).map(r => r.status).sort();
  assert.deepEqual(statuses, [303, 409, 409, 409, 409]);
  assert.equal(bookings[0].joined.length, 1);
});

test('booker and joiners link to their escaped intra profiles; the booker sees joiners on reload', async t => {
  const { post, page } = await server(t, [singles({ spots: 4, players: 2 })]);
  const before = slot(await page(A), '14:00')[1];
  assert.match(before, /<a href="https:\/\/profile\.intra\.42\.fr\/users\/jwosylu">jwosylu<\/a>/);
  assert.doesNotMatch(before, /ben42/);
  await post('/join', join, B);
  const after = slot(await page(A), '14:00')[1];
  assert.match(after, /<a href="https:\/\/profile\.intra\.42\.fr\/users\/ben42">ben42<\/a>/);
  assert.match(after, /jwosylu/);
});

test('logins are escaped in link text and href', async t => {
  const { page } = await server(t, [singles({ login: '"><b>x', joined: [{ login: "'><i>y", browser: 'z' }] })]);
  const text = slot(await page(), '14:00')[1];
  assert.doesNotMatch(text, /<b>|<i>|"><|'>/);
  assert.match(text, /href="https:\/\/profile\.intra\.42\.fr\/users\/&#34;&#62;&#60;b&#62;x">&#34;&#62;&#60;b&#62;x<\/a>/);
});

test('only the booking browser sees the cancel control and only the joining browser sees its leave control', async t => {
  const { page } = await server(t, [singles({ spots: 4, joined: [{ login: 'ben42', browser: id(B) }] })]);
  const a = slot(await page(A), '14:00')[1];
  const b = slot(await page(B), '14:00')[1];
  const c = slot(await page(C), '14:00')[1];
  const none = slot(await page(), '14:00')[1];
  assert.match(a, /action="\/cancel"/);
  assert.doesNotMatch(a, /action="\/leave"/);
  assert.match(b, /action="\/leave"/);
  assert.doesNotMatch(b, /action="\/cancel"/);
  for (const html of [c, none]) assert.doesNotMatch(html, /action="\/(cancel|leave)"/);
  for (const [cookie, html] of [[A, a], [B, b]]) assert.ok(!html.includes(id(cookie)));
});

test('the booking browser can cancel, which frees the slot', async t => {
  const { bookings, post, page } = await server(t, [singles({ joined: [{ login: 'ben42', browser: id(B) }] })]);
  const response = await post('/cancel', { table: '2', time: '14:00' }, A);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/table/2?cancelled=14:00');
  assert.equal(bookings.length, 0);
  assert.equal(slot(await page(A), '14:00')[0], 'free');
});

test('cancel from another browser, the same login typed elsewhere, or no cookie is refused with 403', async t => {
  const { bookings, post } = await server(t, [singles({ joined: [{ login: 'ben42', browser: id(B) }] })]);
  const before = snapshot(bookings);
  for (const [label, cookie, extra] of [['joiner', B], ['stranger', C], ['same login', C, { login: 'jwosylu' }], ['no cookie']]) {
    const response = await post('/cancel', { table: '2', time: '14:00', ...extra }, cookie);
    assert.equal(response.status, 403, label);
    assert.match(await response.text(), /Not cancelled/, label);
  }
  assert.equal(snapshot(bookings), before);
});

test('cancelling a free or ended slot is refused and changes nothing', async t => {
  const { bookings, post } = await server(t, [singles({ start: '2026-10-20T11:00' })]);
  const before = snapshot(bookings);
  assert.equal((await post('/cancel', { table: '2', time: '14:00' }, A)).status, 409);
  assert.equal((await post('/cancel', { table: '2', time: '11:00' }, A)).status, 409);
  assert.equal((await post('/cancel', { table: '2', time: '12:60' }, A)).status, 400);
  assert.equal(snapshot(bookings), before);
});

test('the joining browser can leave, which reopens the spot', async t => {
  const { bookings, post, page } = await server(t, [singles({ joined: [{ login: 'ben42', browser: id(B) }] })]);
  const response = await post('/leave', join, B);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/table/2?left=14:00');
  assert.deepEqual(bookings[0].joined, []);
  assert.match(slot(await page(), '14:00')[1], /1 of 2 spots left/);
});

test('leave from another browser, including the booker, or no cookie is refused with 403', async t => {
  const { bookings, post } = await server(t, [singles({ joined: [{ login: 'ben42', browser: id(B) }] })]);
  const before = snapshot(bookings);
  for (const [label, cookie] of [['booker', A], ['stranger', C], ['no cookie']]) {
    const response = await post('/leave', join, cookie);
    assert.equal(response.status, 403, label);
    assert.match(await response.text(), /Not left/, label);
  }
  assert.equal(snapshot(bookings), before);
});

test('leaving as someone not in the game is refused and changes nothing', async t => {
  const { bookings, post } = await server(t, [singles({ joined: [{ login: 'ben42', browser: id(B) }] })]);
  const before = snapshot(bookings);
  assert.equal((await post('/leave', { ...join, login: 'carl' }, B)).status, 404);
  assert.equal((await post('/leave', { ...join, login: 'jwosylu' }, A)).status, 404);
  assert.equal((await post('/leave', { ...join, time: '15:00' }, B)).status, 409);
  assert.equal(snapshot(bookings), before);
});
