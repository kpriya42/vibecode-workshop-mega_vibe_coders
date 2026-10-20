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

const buttons = body => [...body.matchAll(/<button form="tap"([^>]*)>([^<]*)<\/button>/g)].map(m => [m[1], m[2]]);

test('each free, not-ended slot has one Book button and each open game one Join button, all submitting the one settings form', async t => {
  const get = await server(t, [
    { table: 2, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'ben42', browser: 'x', joined: [] },
    { table: 2, start: '2026-10-20T15:00', spots: 2, players: 2, login: 'ben42', browser: 'x', joined: [] },
  ]);
  const html = (await get('/table/2')).html;
  const form = html.match(/<form id="tap" method="post" action="\/book"[^>]*>([^]*?)<\/form>/)[1];
  assert.match(form, /<input type="hidden" name="table" value="2">/);
  assert.match(form, /name="login"/);
  assert.match(form, /name="spots" value="2" checked/);
  assert.match(form, /name="spots" value="4"/);
  assert.match(form, /name="players"[^>]*value="1"/);
  // Enter in the login field must not book the first free slot: the form's default button is disabled.
  assert.match(form, /^[^]*?<button[^>]*\bdisabled\b[^>]*>/);
  assert.doesNotMatch(form.slice(0, form.search(/<button[^>]*disabled/)), /<button/);
  const list = rows(html);
  for (const [time, [status, body]] of Object.entries(list)) {
    const tap = buttons(body);
    if (status === 'free') assert.deepEqual(tap, [[` name="time" value="${time}"`, 'Book']], time);
    else if (status === 'open') assert.deepEqual(tap, [[` name="time" value="${time}" formaction="/join"`, 'Join']], time);
    else assert.deepEqual(tap, [], time);
  }
  assert.equal(list['11:30'][0], 'ended');
  assert.equal(list['14:00'][0], 'open');
  assert.equal(list['15:00'][0], 'full');
});

test('there is no time dropdown and no per-slot panel', async t => {
  const { html } = await (await server(t))('/table/1');
  assert.doesNotMatch(html, /<select/);
  assert.doesNotMatch(html, /<option value="\d\d:\d\d"/);
  assert.doesNotMatch(html, /<details/);
  assert.equal([...html.matchAll(/name="login"/g)].length, 1);
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
