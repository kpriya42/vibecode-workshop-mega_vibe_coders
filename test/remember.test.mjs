import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

// 10:00Z on 20 Oct 2026 is 12:00 in Berlin: slots before 12:00 have ended.
const A = 'browser=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'browser=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

async function server(t, bookings = []) {
  const app = createApp({ revision: 'test', now: () => new Date('2026-10-20T10:00:00Z'), bookings });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { app.close(resolve); app.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${app.address().port}`;
  const post = (path, fields, cookie) => fetch(origin + path, {
    method: 'POST', redirect: 'manual', headers: cookie ? { cookie } : {}, body: new URLSearchParams(fields),
  });
  const page = async cookie => (await fetch(`${origin}/table/2`, { headers: cookie ? { cookie } : {} })).text();
  return { bookings, post, page };
}

const loginValue = html => html.match(/<input name="login"[^>]*>/)[0].match(/ value="([^"]*)"/)?.[1] ?? '';
const loginCookie = response => response.headers.getSetCookie().find(c => c.startsWith('login='));
const row = (html, time) => html.match(new RegExp(`<li class="slot \\w+"><time>${time}</time>(.*?)</li>`))[1];
const book = { table: '2', time: '14:00', login: 'jwosylu', spots: '2', players: '1' };

test('a successful book remembers the login in a cookie and the next visit shows it prefilled', async t => {
  const { post, page } = await server(t);
  assert.equal(loginValue(await page(A)), '');
  const response = await post('/book', book, A);
  assert.equal(response.status, 303);
  const cookie = loginCookie(response);
  assert.match(cookie, /^login=jwosylu;.*Path=\//);
  assert.equal(loginValue(await page(`${A}; ${cookie.split(';')[0]}`)), 'jwosylu');
});

test('a successful join remembers the joining login', async t => {
  const { post } = await server(t, [{ table: 2, start: '2026-10-20T14:00', spots: 2, players: 1, login: 'jwosylu', browser: 'x', joined: [] }]);
  const response = await post('/join', { table: '2', time: '14:00', login: 'ben42' }, B);
  assert.equal(response.status, 303);
  assert.match(loginCookie(response), /^login=ben42;/);
});

test('a refused action does not remember the login', async t => {
  const { post } = await server(t);
  const response = await post('/book', { ...book, login: 'jw osylu' }, A);
  assert.equal(response.status, 400);
  assert.equal(loginCookie(response), undefined);
});

test('a remembered login that is not a valid login is never rendered', async t => {
  const { page } = await server(t);
  for (const junk of ['%22%3E%3Cb%3Ex', '"><b>x', 'a b', 'x'.repeat(40)]) {
    const html = await page(`login=${junk}`);
    assert.equal(loginValue(html), '', junk);
    assert.doesNotMatch(html, /<b>x/, junk);
  }
});

test('an empty login on one tap is refused with a message pointing at the login field, keeps the settings, and books nothing', async t => {
  const { bookings, post } = await server(t);
  for (const login of ['', '   ']) {
    const response = await post('/book', { ...book, login, spots: '4', players: '2' }, A);
    assert.equal(response.status, 400);
    const html = await response.text();
    assert.match(html, /Not booked: Enter your 42 login in the Login field at the top/);
    assert.match(html, /name="spots" value="4" checked/);
    assert.match(html, /name="players"[^>]*value="2"/);
  }
  const response = await post('/join', { table: '2', time: '14:00', login: '' }, A);
  assert.match(await response.text(), /Not joined: Enter your 42 login in the Login field at the top/);
  assert.deepEqual(bookings, []);
});

test('a refused tap keeps what the player typed, escaped', async t => {
  const { post } = await server(t);
  const html = await (await post('/book', { ...book, login: '"><b>x' }, A)).text();
  assert.equal(loginValue(html), '&#34;&#62;&#60;b&#62;x');
  assert.doesNotMatch(html, /<b>x/);
});

test('rows owned by this browser say so; the login cookie alone grants nothing', async t => {
  const { post, page } = await server(t);
  await post('/book', { ...book, spots: '4' }, A);
  await post('/join', { table: '2', time: '14:00', login: 'ben42' }, B);
  const a = row(await page(A), '14:00');
  assert.match(a, /You booked/);
  assert.match(a, /action="\/cancel"/);
  assert.doesNotMatch(a, /formaction="\/join"/);
  assert.match(a, /<a href="https:\/\/profile\.intra\.42\.fr\/users\/ben42">ben42<\/a>/);
  const b = row(await page(B), '14:00');
  assert.match(b, /You joined/);
  assert.match(b, /action="\/leave"/);
  assert.doesNotMatch(b, /action="\/cancel"|formaction="\/join"/);
  for (const cookie of ['login=jwosylu', 'login=ben42', `browser=cccccccc-cccc-4ccc-8ccc-cccccccccccc; login=jwosylu`]) {
    const other = row(await page(cookie), '14:00');
    assert.doesNotMatch(other, /You booked|You joined|action="\/(cancel|leave)"/, cookie);
    assert.match(other, /formaction="\/join"/, cookie);
  }
  const refused = await post('/cancel', { table: '2', time: '14:00' }, 'login=jwosylu');
  assert.equal(refused.status, 403);
});

test('a refused cancel keeps the remembered login in the field', async t => {
  const { post } = await server(t);
  const html = await (await post('/cancel', { table: '2', time: '14:00' }, `${A}; login=jwosylu`)).text();
  assert.match(html, /Not cancelled/);
  assert.equal(loginValue(html), 'jwosylu');
});
