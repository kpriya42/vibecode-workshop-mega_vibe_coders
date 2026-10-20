import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

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

// Booking: { table: 1|2, start: 'YYYY-MM-DDTHH:MM' (Berlin wall-clock slot start), spots: 2|4, players: filled count }.
function tablePage(table, { now, bookings, opens, closes }) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(p => [p.type, p.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const minutesNow = Number(parts.hour) * 60 + Number(parts.minute);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  // shortcut: compares Berlin wall-clock minutes, wrong only if opening hours span the 02:00–03:00 DST jump.
  const items = [];
  for (let start = opens * 60; start < closes * 60; start += 30) {
    const time = `${pad(Math.floor(start / 60))}:${pad(start % 60)}`;
    const booking = bookings.find(b => b.table === table && b.start === `${today}T${time}`);
    const [status, label] = start + 30 <= minutesNow ? ['ended', 'Ended']
      : !booking ? ['free', 'Free']
      : booking.players >= booking.spots ? ['full', 'Full']
      : ['open', `${escape(booking.spots - booking.players)} of ${escape(booking.spots)} spots left`];
    items.push(`<li class="slot ${status}"><time>${time}</time><span>${label}</span></li>`);
  }
  const closed = closes * 60 <= minutesNow ? '<p class="notice">Closed for today — every slot has ended. Come back tomorrow.</p>' : '';
  const other = table === 1 ? 2 : 1;
  return layout(`Table ${table} · Today's slots`, `
  <nav><a href="/table/${other}">Switch to table ${other} →</a></nav>
  <h1>Table ${table}</h1>
  <p class="intro">${date} · German time</p>
  ${closed}
  <ol class="slots">${items.join('')}</ol>`);
}

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
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { allow: 'GET, HEAD' });
      return res.end('Method not allowed');
    }
    let path;
    try { path = new URL(req.url, 'http://localhost').pathname; }
    catch { res.writeHead(400); return res.end('Bad request'); }
    if (path === '/api/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ ok: true, revision }));
    }
    const table = path.match(/^\/table\/([12])$/);
    if (table) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? undefined : tablePage(Number(table[1]), { now: now(), bookings, opens, closes }));
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
