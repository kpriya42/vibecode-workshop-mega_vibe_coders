import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { load, save } from './store.mjs';

const assets = new Map([
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
]);

const escape = value => String(value).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const pad = n => String(n).padStart(2, '0');

const layout = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body><main class="table">${body}</main></body>
</html>`;

// Booking: { table: 1|2, start: 'YYYY-MM-DDTHH:MM' (Berlin wall-clock slot start), spots: 2|4, players: booker's group size, login: booker's 42 login, browser: booker's server-issued browser id, joined: [{ login, browser }] one spot each }.
function berlin(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(p => [p.type, p.value]));
  return { today: `${parts.year}-${parts.month}-${parts.day}`, minutesNow: Number(parts.hour) * 60 + Number(parts.minute) };
}

const profile = login => `<a href="https://profile.intra.42.fr/users/${escape(login)}">${escape(login)}</a>`;
const hidden = (table, time) => `<input type="hidden" name="table" value="${table}"><input type="hidden" name="time" value="${time}">`;

// settings: { login, spots, players } as the player last typed them, rendered escaped into the one tap form.
function tablePage(table, { now, bookings, opens, closes }, message = '', browser, settings = {}) {
  const { today, minutesNow } = berlin(now);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  // shortcut: compares Berlin wall-clock minutes, wrong only if opening hours span the 02:00–03:00 DST jump.
  const items = [];
  for (let start = opens * 60; start < closes * 60; start += 30) {
    const time = `${pad(Math.floor(start / 60))}:${pad(start % 60)}`;
    const booking = bookings.find(b => b.table === table && b.start === `${today}T${time}`);
    const joined = booking?.joined ?? [];
    const [status, label] = start + 30 <= minutesNow ? ['ended', 'Ended']
      : !booking ? ['free', 'Free']
      : booking.players + joined.length >= booking.spots ? ['full', 'Full']
      : ['open', `${escape(booking.spots - booking.players - joined.length)} of ${escape(booking.spots)} spots left`];
    const tap = (verb, extra = '') => `<button form="tap" name="time" value="${time}"${extra}>${verb}</button>`;
    let text = label;
    let controls = status === 'free' ? tap('Book') : '';
    if (booking && status !== 'ended') {
      const mine = booking.browser === browser;
      const mineJoined = joined.filter(p => p.browser === browser);
      const you = mine ? 'You booked' : mineJoined.length ? 'You joined' : '';
      text = `${you ? `<strong class="you">${you}</strong> · ` : ''}${label} · ${profile(booking.login ?? '')}${booking.players > 1 ? ` (group of ${escape(booking.players)})` : ''}${joined.map(p => `, ${profile(p.login)}`).join('')}`;
      if (status === 'open' && !you) controls += tap('Join', ' formaction="/join"');
      if (mine) controls += `<form method="post" action="/cancel">${hidden(table, time)}<button type="submit">Cancel booking</button></form>`;
      for (const p of mineJoined) {
        controls += `<form method="post" action="/leave">${hidden(table, time)}<input type="hidden" name="login" value="${escape(p.login)}"><button type="submit">Leave as ${escape(p.login)}</button></form>`;
      }
    }
    items.push(`<li class="slot ${status}"><time>${time}</time><span>${text}</span>${controls && `<div class="controls">${controls}</div>`}</li>`);
  }
  const { spots } = settings;
  const closed = closes * 60 <= minutesNow ? '<p class="notice">Closed for today — every slot has ended. Come back tomorrow.</p>' : '';
  const tab = n => `<a href="/table/${n}"${n === table ? ' aria-current="page"' : ''}>Table ${n}</a>`;
  return layout(`Table ${table} · Ping Pong 42`, `
  <header><a class="wordmark" href="/">PING PONG 42</a><nav class="switch" aria-label="Table">${tab(1)}${tab(2)}</nav></header>
  <h1>Table ${table}</h1>
  <p class="intro">${date} · German time</p>
  ${message}${closed}
  <form id="tap" method="post" action="/book" class="settings">
    <button type="submit" disabled hidden></button>
    <input type="hidden" name="table" value="${table}">
    <label class="login">Login <input name="login" value="${escape(settings.login ?? '')}" required maxlength="32" pattern="[A-Za-z0-9\-]+" placeholder="your 42 login" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
    <fieldset><legend>Game</legend><label><input type="radio" name="spots" value="2"${spots === '4' ? '' : ' checked'}> Singles</label><label><input type="radio" name="spots" value="4"${spots === '4' ? ' checked' : ''}> Doubles</label></fieldset>
    <label class="players">Players with me <input name="players" type="number" min="1" max="4" value="${escape(settings.players ?? '1')}" required inputmode="numeric"></label>
  </form>
  <ol class="slots">${items.join('')}</ol>
  <p class="how">Scan the QR code on a table, book a free slot with your 42 login or join an open game, then meet at the table.</p>`);
}

class Refusal extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const field = (form, name) => {
  const value = form.get(name);
  if (value === null) throw new Refusal(400, `The ${name} field is missing.`);
  return value;
};

// Returns the form's table and today's not-ended slot, or throws a Refusal.
function slotOf(form, { now, opens, closes }) {
  const table = field(form, 'table');
  if (table !== '1' && table !== '2') throw new Refusal(400, 'Table must be 1 or 2.');
  const time = field(form, 'time');
  if (!/^\d\d:\d\d$/.test(time)) throw new Refusal(400, 'Time must look like 14:00.');
  const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  // The round trip to HH:MM rejects out-of-range parts like 12:60, which would otherwise alias 13:00.
  if (time !== `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}` || minutes % 30 || minutes < opens * 60 || minutes >= closes * 60) throw new Refusal(400, `${time} is not a slot within opening hours.`);
  const { today, minutesNow } = berlin(now);
  if (minutes + 30 <= minutesNow) throw new Refusal(409, `The ${time} slot has already ended.`);
  return { table: Number(table), time, start: `${today}T${time}` };
}

function loginOf(form) {
  const login = field(form, 'login').trim();
  if (!/^[A-Za-z0-9-]{1,32}$/.test(login)) throw new Refusal(400, 'Enter your 42 login in the Login field at the top: letters, digits and hyphens only, no spaces.');
  return login;
}

function bookingAt(bookings, { table, time, start }) {
  const booking = bookings.find(b => b.table === table && b.start === start);
  if (!booking) throw new Refusal(409, `The ${time} slot on table ${table} is free. Book it instead.`);
  return booking;
}

// Each action validates a form, changes bookings and returns { table, time }, or throws a Refusal.
// All are synchronous so check-and-store cannot interleave.
function book(form, ctx, browser) {
  const slot = slotOf(form, ctx);
  const login = loginOf(form);
  const spots = field(form, 'spots');
  if (spots !== '2' && spots !== '4') throw new Refusal(400, 'Choose singles (2 spots) or doubles (4 spots).');
  const players = field(form, 'players');
  if (!/^\d+$/.test(players) || Number(players) < 1 || Number(players) > Number(spots)) {
    throw new Refusal(400, `Your group must fill between 1 and ${spots} spots.`);
  }
  if (ctx.bookings.some(b => b.table === slot.table && b.start === slot.start)) throw new Refusal(409, `The ${slot.time} slot on table ${slot.table} is already booked.`);
  ctx.bookings.push({ table: slot.table, start: slot.start, spots: Number(spots), players: Number(players), login, browser, joined: [] });
  return slot;
}

function join(form, ctx, browser) {
  const slot = slotOf(form, ctx);
  const login = loginOf(form);
  const booking = bookingAt(ctx.bookings, slot);
  booking.joined ??= [];
  if ([booking.login, ...booking.joined.map(p => p.login)].some(l => l?.toLowerCase() === login.toLowerCase())) {
    throw new Refusal(409, `${login} is already in the ${slot.time} game.`);
  }
  if (booking.players + booking.joined.length >= booking.spots) throw new Refusal(409, `The ${slot.time} game is full.`);
  booking.joined.push({ login, browser });
  return slot;
}

function cancel(form, ctx, browser) {
  const slot = slotOf(form, ctx);
  const booking = bookingAt(ctx.bookings, slot);
  if (booking.browser !== browser) throw new Refusal(403, 'Only the browser that made this booking can cancel it.');
  ctx.bookings.splice(ctx.bookings.indexOf(booking), 1);
  return slot;
}

function leave(form, ctx, browser) {
  const slot = slotOf(form, ctx);
  const login = field(form, 'login');
  const joined = bookingAt(ctx.bookings, slot).joined ?? [];
  const player = joined.find(p => p.login === login);
  if (!player) throw new Refusal(404, `${login} has not joined the ${slot.time} game.`);
  if (player.browser !== browser) throw new Refusal(403, 'Only the browser that joined can leave.');
  joined.splice(joined.indexOf(player), 1);
  return slot;
}

const actions = new Map([
  ['/book', [book, 'booked', 'Not booked']],
  ['/join', [join, 'joined', 'Not joined']],
  ['/cancel', [cancel, 'cancelled', 'Not cancelled']],
  ['/leave', [leave, 'left', 'Not left']],
]);
// A Map, not an object, so query keys like toString cannot reach inherited properties.
const done = new Map([
  ['booked', 'Booked $. See you at the table!'],
  ['joined', 'Joined $. See you at the table!'],
  ['cancelled', 'Cancelled $. The slot is free again.'],
  ['left', 'Left $. Your spot is open again.'],
]);

const maxBody = 4096;

const notFound = layout('Not found', `<h1>Not found</h1><p class="intro">This page or table does not exist.</p><p><a href="/table/1">Go to table 1</a> · <a href="/table/2">table 2</a></p>`);

export function createApp({
  revision = process.env.APP_REVISION || 'development',
  now = () => new Date(),
  dataDir, // where bookings.json lives; without it bookings are kept in memory only
  bookings = dataDir ? load(dataDir) : [],
  opens = 9,
  closes = 18,
} = {}) {
  // Every successful change calls this before its success response. On failure the unsaved change is dropped.
  const persist = () => {
    if (!dataDir) return;
    try { save(dataDir, bookings); }
    catch (error) {
      console.error('Could not save bookings:', error.message);
      bookings.splice(0, bookings.length, ...load(dataDir));
      throw new Refusal(500, 'It could not be saved. Please try again.');
    }
  };
  return http.createServer(async (req, res) => {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-store');
    const id = req.headers.cookie?.match(/(?:^|;\s*)browser=([0-9a-f-]{36})(?:;|$)/)?.[1];
    // Only a valid login is prefilled; anything else in the cookie is ignored.
    const remembered = req.headers.cookie?.match(/(?:^|;\s*)login=([A-Za-z0-9-]{1,32})(?:;|$)/)?.[1] ?? '';
    const [spots, players] = req.headers.cookie?.match(/(?:^|;\s*)game=(2-[12]|4-[1-4])(?:;|$)/)?.[1].split('-') ?? [];
    const action = req.method === 'POST' && actions.get(req.url);
    if (action) {
      const [run, past, refused] = action;
      const browser = id ?? randomUUID();
      if (!id) res.setHeader('set-cookie', `browser=${browser}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`);
      const chunks = [];
      let size = 0;
      try {
        for await (const chunk of req) {
          chunks.push(chunk);
          if ((size += chunk.length) > maxBody) {
            res.writeHead(413, { 'content-type': 'text/plain; charset=utf-8', connection: 'close' });
            return res.end('Request too large.');
          }
        }
      } catch { return; } // client went away mid-body; nothing to answer or book
      const form = new URLSearchParams(Buffer.concat(chunks).toString());
      try {
        const { table, time } = run(form, { now: now(), bookings, opens, closes }, browser);
        persist();
        // Remembers the login for prefill only; ownership stays with the browser cookie. loginOf allowed only [A-Za-z0-9-].
        const login = form.get('login')?.trim();
        if (run === book || run === join) res.appendHeader('set-cookie', `login=${login}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`);
        // Keeps the bar's game and group for the next tap; a join does not validate them, so only a valid pair is kept.
        const game = `${form.get('spots')}-${form.get('players')}`;
        if ((run === book || run === join) && /^(2-[12]|4-[1-4])$/.test(game)) res.appendHeader('set-cookie', `game=${game}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`);
        res.writeHead(303, { location: `/table/${table}?${past}=${time}` });
        return res.end();
      } catch (error) {
        if (!(error instanceof Refusal)) throw error;
        const notice = `<p class="notice error" role="alert">${refused}: ${escape(error.message)}</p>`;
        const table = form.get('table');
        res.writeHead(error.status, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(table === '1' || table === '2'
          ? tablePage(Number(table), { now: now(), bookings, opens, closes }, notice, browser,
            { login: form.get('login') ?? remembered, spots: form.get('spots') ?? spots, players: form.get('players') ?? players })
          : layout(refused, `<h1>${refused}</h1>${notice}<p><a href="/table/1">Go to table 1</a> · <a href="/table/2">table 2</a></p>`));
      }
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { allow: 'GET, HEAD' });
      return res.end('Method not allowed');
    }
    let url;
    try { url = new URL(req.url, 'http://localhost'); }
    catch { res.writeHead(400); return res.end('Bad request'); }
    const path = url.pathname;
    if (path === '/api/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ ok: true, revision }));
    }
    const table = path === '/' ? [path, '1'] : path.match(/^\/table\/([12])$/);
    if (table) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      const [key, time] = [...url.searchParams].find(([k, v]) => done.has(k) && /^\d\d:\d\d$/.test(v)) ?? [];
      return res.end(req.method === 'HEAD' ? undefined : tablePage(Number(table[1]), { now: now(), bookings, opens, closes },
        key ? `<p class="notice success" role="status">${done.get(key).replace('$', time)}</p>` : '', id,
        { login: remembered, spots, players }));
    }
    const asset = assets.get(path);
    if (!asset) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? undefined : notFound);
    }
    try {
      const body = await readFile(new URL(`./public/${asset[0]}`, import.meta.url));
      res.writeHead(200, { 'content-type': asset[1] });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      console.error('Asset unavailable:', error.message);
      res.writeHead(500);
      res.end('Page temporarily unavailable');
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535');
  let app;
  try { app = createApp({ dataDir: process.env.VC_DATA_DIR || `${homedir()}/.local/share/vibecode-workshop/data` }); }
  catch (error) { console.error(`Not starting: ${error.message}`); process.exit(1); }
  app.on('error', error => { console.error(error.message); process.exitCode = 1; });
  app.listen(port, host, () => console.log(`Workshop app listening on ${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      app.close(() => process.exit(0));
      app.closeIdleConnections();
    });
  }
}
