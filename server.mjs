import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
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

// Booking: { table: 1|2, start: 'YYYY-MM-DDTHH:MM' (Berlin wall-clock slot start), spots: 2|4, players: filled count, login: booker's 42 login, browser: booker's server-issued browser id }.
function berlin(now) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(p => [p.type, p.value]));
  return { today: `${parts.year}-${parts.month}-${parts.day}`, minutesNow: Number(parts.hour) * 60 + Number(parts.minute) };
}

function tablePage(table, { now, bookings, opens, closes }, message = '') {
  const { today, minutesNow } = berlin(now);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  // shortcut: compares Berlin wall-clock minutes, wrong only if opening hours span the 02:00–03:00 DST jump.
  const items = [];
  const free = [];
  for (let start = opens * 60; start < closes * 60; start += 30) {
    const time = `${pad(Math.floor(start / 60))}:${pad(start % 60)}`;
    const booking = bookings.find(b => b.table === table && b.start === `${today}T${time}`);
    const [status, label] = start + 30 <= minutesNow ? ['ended', 'Ended']
      : !booking ? ['free', 'Free']
      : booking.players >= booking.spots ? ['full', 'Full']
      : ['open', `${escape(booking.spots - booking.players)} of ${escape(booking.spots)} spots left`];
    if (status === 'free') free.push(`<option value="${time}">${time}</option>`);
    const by = booking && status !== 'ended' ? ` · ${escape(booking.login ?? '')}` : '';
    items.push(`<li class="slot ${status}"><time>${time}</time><span>${label}${by}</span></li>`);
  }
  const closed = closes * 60 <= minutesNow ? '<p class="notice">Closed for today — every slot has ended. Come back tomorrow.</p>' : '';
  const form = free.length ? `
  <form method="post" action="/book" class="book">
    <h2>Book a slot</h2>
    <input type="hidden" name="table" value="${table}">
    <label>Time <select name="time" required>${free.join('')}</select></label>
    <label>Your 42 login <input name="login" required maxlength="32" pattern="[A-Za-z0-9\-]+" autocomplete="username" autocapitalize="none" spellcheck="false"></label>
    <label>Game <select name="spots"><option value="2">Singles (2 spots)</option><option value="4">Doubles (4 spots)</option></select></label>
    <label>Your group fills <input name="players" type="number" min="1" max="4" value="1" required inputmode="numeric"></label>
    <button type="submit">Book</button>
  </form>` : '';
  const other = table === 1 ? 2 : 1;
  return layout(`Table ${table} · Today's slots`, `
  <nav><a href="/table/${other}">Switch to table ${other} →</a></nav>
  <h1>Table ${table}</h1>
  <p class="intro">${date} · German time</p>
  ${message}${closed}
  <ol class="slots">${items.join('')}</ol>${form}`);
}

class Refusal extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Validates a booking form and returns the booking, or throws a Refusal. Synchronous so check-and-store cannot interleave.
function book(form, { now, bookings, opens, closes }, browser) {
  const field = name => {
    const value = form.get(name);
    if (value === null) throw new Refusal(400, `The ${name} field is missing.`);
    return value;
  };
  const table = field('table');
  if (table !== '1' && table !== '2') throw new Refusal(400, 'Table must be 1 or 2.');
  const time = field('time');
  if (!/^\d\d:\d\d$/.test(time)) throw new Refusal(400, 'Time must look like 14:00.');
  const login = field('login').trim();
  if (!/^[A-Za-z0-9-]{1,32}$/.test(login)) throw new Refusal(400, 'Enter your 42 login: letters, digits and hyphens only, no spaces.');
  const spots = field('spots');
  if (spots !== '2' && spots !== '4') throw new Refusal(400, 'Choose singles (2 spots) or doubles (4 spots).');
  const players = field('players');
  if (!/^\d+$/.test(players) || Number(players) < 1 || Number(players) > Number(spots)) {
    throw new Refusal(400, `Your group must fill between 1 and ${spots} spots.`);
  }
  const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  if (minutes % 30 || minutes < opens * 60 || minutes >= closes * 60) throw new Refusal(400, `${time} is not a slot within opening hours.`);
  const { today, minutesNow } = berlin(now);
  if (minutes + 30 <= minutesNow) throw new Refusal(409, `The ${time} slot has already ended.`);
  const start = `${today}T${time}`;
  if (bookings.some(b => b.table === Number(table) && b.start === start)) throw new Refusal(409, `The ${time} slot on table ${table} is already booked.`);
  const booking = { table: Number(table), start, spots: Number(spots), players: Number(players), login, browser };
  bookings.push(booking);
  return booking;
}

const maxBody = 4096;

const notFound = layout('Not found', `<h1>Not found</h1><p class="intro">This page or table does not exist.</p><p><a href="/table/1">Go to table 1</a> · <a href="/table/2">table 2</a></p>`);

export function createApp({
  revision = process.env.APP_REVISION || 'development',
  now = () => new Date(),
  bookings = [],
  opens = 9,
  closes = 18,
} = {}) {
  return http.createServer(async (req, res) => {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'no-store');
    if (req.method === 'POST' && req.url === '/book') {
      const id = req.headers.cookie?.match(/(?:^|;\s*)browser=([0-9a-f-]{36})(?:;|$)/)?.[1];
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
        const booking = book(form, { now: now(), bookings, opens, closes }, browser);
        res.writeHead(303, { location: `/table/${booking.table}?booked=${booking.start.slice(11)}` });
        return res.end();
      } catch (error) {
        if (!(error instanceof Refusal)) throw error;
        const notice = `<p class="notice error" role="alert">Not booked: ${escape(error.message)}</p>`;
        const table = form.get('table');
        res.writeHead(error.status, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(table === '1' || table === '2'
          ? tablePage(Number(table), { now: now(), bookings, opens, closes }, notice)
          : layout('Not booked', `<h1>Not booked</h1>${notice}<p><a href="/table/1">Go to table 1</a> · <a href="/table/2">table 2</a></p>`));
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
    const table = path.match(/^\/table\/([12])$/);
    if (table) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? undefined : tablePage(Number(table[1]), { now: now(), bookings, opens, closes },
        /^\d\d:\d\d$/.test(url.searchParams.get('booked')) ? `<p class="notice success" role="status">Booked ${url.searchParams.get('booked')}. See you at the table!</p>` : ''));
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
  const app = createApp();
  app.on('error', error => { console.error(error.message); process.exitCode = 1; });
  app.listen(port, host, () => console.log(`Workshop app listening on ${host}:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      app.close(() => process.exit(0));
      app.closeIdleConnections();
    });
  }
}
