import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

async function page(t, path, { now = '2026-10-20T10:00:00Z', bookings = [] } = {}) {
  const app = createApp({ revision: 'test', now: () => new Date(now), bookings });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const response = await fetch(`http://127.0.0.1:${app.address().port}${path}`);
  return { response, html: await response.text() };
}

// Returns [[time, status], ...] for each rendered slot.
const slots = html => [...html.matchAll(/<li class="slot (\w+)"><time>(\d\d:\d\d)<\/time>/g)].map(m => [m[2], m[1]]);

test('table pages list 18 half-hour slots from 09:00 to 17:30 and link to the other table', async t => {
  for (const [table, other] of [[1, 2], [2, 1]]) {
    const { response, html } = await page(t, `/table/${table}`, { now: '2026-10-20T05:00:00Z' });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    const list = slots(html);
    assert.equal(list.length, 18);
    assert.equal(list[0][0], '09:00');
    assert.equal(list[17][0], '17:30');
    assert.ok(list.every(([, status]) => status === 'free'));
    assert.match(html, new RegExp(`href="/table/${other}"`));
  }
});

test('opening hours are configurable', async t => {
  const app = createApp({ now: () => new Date('2026-10-20T05:00:00Z'), opens: 10, closes: 12 });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const html = await (await fetch(`http://127.0.0.1:${app.address().port}/table/1`)).text();
  assert.deepEqual(slots(html).map(([time]) => time), ['10:00', '10:30', '11:00', '11:30']);
});

test('bookings show open with spots left or full, only on their own table', async t => {
  const bookings = [
    { table: 1, start: '2026-10-20T14:00', spots: 2, players: 1 },
    { table: 1, start: '2026-10-20T15:00', spots: 4, players: 4 },
    { table: 2, start: '2026-10-20T16:00', spots: 2, players: 2 },
    { table: 1, start: '2026-10-19T16:00', spots: 2, players: 2 },
  ];
  const { html } = await page(t, '/table/1', { bookings });
  const status = Object.fromEntries(slots(html));
  assert.equal(status['14:00'], 'open');
  assert.match(html, /14:00<\/time>[^]*?1 of 2 spots left/);
  assert.equal(status['15:00'], 'full');
  assert.equal(status['16:00'], 'free');
  assert.equal(status['14:30'], 'free');
});

test('Berlin summer time: at 12:00 CEST earlier slots ended, 12:00 is not, date is 20 Oct', async t => {
  const { html } = await page(t, '/table/1', { now: '2026-10-20T10:00:00Z' });
  const status = Object.fromEntries(slots(html));
  assert.equal(status['11:30'], 'ended');
  assert.equal(status['09:00'], 'ended');
  assert.equal(status['12:00'], 'free');
  assert.match(html, /20 October 2026/);
});

test('Berlin winter time: at 11:00 CET 11:00 is current and 10:30 ended', async t => {
  const status = Object.fromEntries(slots((await page(t, '/table/1', { now: '2026-12-01T10:00:00Z' })).html));
  assert.equal(status['10:30'], 'ended');
  assert.equal(status['11:00'], 'free');
});

test('DST end day: 18 slots, 09:00 current, none ended', async t => {
  const list = slots((await page(t, '/table/2', { now: '2026-10-25T08:00:00Z' })).html);
  assert.equal(list.length, 18);
  assert.deepEqual(list[0], ['09:00', 'free']);
  assert.ok(list.every(([, status]) => status !== 'ended'));
});

test('after Berlin midnight today is the next day and nothing is ended', async t => {
  const { html } = await page(t, '/table/1', { now: '2026-10-20T23:30:00Z' });
  assert.match(html, /21 October 2026/);
  assert.ok(slots(html).every(([, status]) => status === 'free'));
});

test('after closing every slot is ended and the page says so', async t => {
  const { html } = await page(t, '/table/1', { now: '2026-10-20T16:30:00Z' });
  const list = slots(html);
  assert.equal(list.length, 18);
  assert.ok(list.every(([, status]) => status === 'ended'));
  assert.match(html, /closed for today/i);
});

test('unknown tables get an HTML 404 linking to a real table', async t => {
  for (const path of ['/table/3', '/table/0', '/table/abc', '/table/', '/table/1/x']) {
    const { response, html } = await page(t, path);
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get('content-type'), /text\/html/, path);
    assert.match(html, /href="\/table\/1"/, path);
  }
});

test('rendered booking data is HTML-escaped', async t => {
  const bookings = [{ table: 1, start: '2026-10-20T14:00', spots: '<b>2</b>', players: 0 }];
  const { html } = await page(t, '/table/1', { bookings });
  assert.doesNotMatch(html, /<b>2<\/b>/);
});
