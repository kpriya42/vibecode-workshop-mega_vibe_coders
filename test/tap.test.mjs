import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

// 10:00Z on 20 Oct 2026 is 12:00 in Berlin: slots before 12:00 have ended.
async function server(t, bookings = []) {
  const app = createApp({ revision: 'test', now: () => new Date('2026-10-20T10:00:00Z'), bookings });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${app.address().port}`;
  return async path => {
    const response = await fetch(origin + path);
    return { response, html: await response.text() };
  };
}

const rows = html => Object.fromEntries([...html.matchAll(/<li class="slot (\w+)"><time>(\d\d:\d\d)<\/time>(.*?)<\/li>/g)].map(m => [m[2], [m[1], m[3]]]));
const current = html => [...html.matchAll(/<a href="\/table\/(\d)" aria-current="page">/g)].map(m => m[1]);

test('/ is the booking view for table 1 with the Ping Pong 42 header and a table switch', async t => {
  const get = await server(t);
  const { response, html } = await get('/');
  assert.equal(response.status, 200);
  assert.match(html, /Ping Pong 42/i);
  assert.equal(Object.keys(rows(html)).length, 18);
  assert.match(html, /href="\/table\/1"/);
  assert.match(html, /href="\/table\/2"/);
  assert.deepEqual(current(html), ['1']);
  assert.deepEqual(current((await get('/table/2')).html), ['2']);
  assert.deepEqual(current((await get('/table/1')).html), ['1']);
});

test('each free, not-ended slot has its own Book form for exactly that slot; others have none', async t => {
  const get = await server(t, [
    { table: 2, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'ben42', browser: 'x', joined: [] },
    { table: 2, start: '2026-10-20T15:00', spots: 2, players: 2, login: 'ben42', browser: 'x', joined: [] },
  ]);
  const list = rows((await get('/table/2')).html);
  for (const [time, [status, body]] of Object.entries(list)) {
    const forms = [...body.matchAll(/action="\/book"/g)].length;
    if (status === 'free') {
      assert.equal(forms, 1, time);
      assert.match(body, /<summary[^>]*>Book<\/summary>/, time);
      assert.match(body, new RegExp(`name="table" value="2"><input type="hidden" name="time" value="${time}"`), time);
      assert.match(body, /name="login"/, time);
      assert.match(body, /name="spots"/, time);
      assert.match(body, /name="players"/, time);
      assert.match(body, new RegExp(`${time} · Table 2`), time);
    } else assert.equal(forms, 0, time);
  }
  assert.equal(list['11:30'][0], 'ended');
  assert.equal(list['14:00'][0], 'open');
  assert.match(list['14:00'][1], /<summary[^>]*>Join<\/summary>/);
  assert.equal(list['15:00'][0], 'full');
  assert.doesNotMatch(list['15:00'][1], /<summary/);
});

test('there is no time dropdown, and slot panels open one at a time', async t => {
  const { html } = await (await server(t))('/table/1');
  assert.doesNotMatch(html, /<select name="time"/);
  assert.doesNotMatch(html, /<option value="\d\d:\d\d"/);
  const panels = [...html.matchAll(/<details[^>]*>/g)].map(m => m[0]);
  assert.ok(panels.length > 0);
  assert.ok(panels.every(p => p.includes('name="slot"')));
});

test('junk or prototype query parameters on / render the page without injecting markup', async t => {
  const get = await server(t);
  for (const query of ['slot=<script>x</script>', 'slot=14:00', 'toString=14:00', '__proto__=14:00', 'booked=<b>x</b>']) {
    const { response, html } = await get(`/?${query}`);
    assert.equal(response.status, 200, query);
    assert.doesNotMatch(html, /<script>|<b>x/, query);
    assert.doesNotMatch(html, /role="status"/, query);
  }
  assert.equal((await get('/api/health')).response.status, 200);
});
