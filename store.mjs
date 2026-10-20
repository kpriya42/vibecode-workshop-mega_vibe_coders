import { readFileSync, mkdirSync, openSync, writeSync, fsyncSync, closeSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const fileIn = dir => join(dir, 'bookings.json');

// Returns the saved bookings: [] when the file or directory is missing or the file is empty.
// Throws on a damaged file, so the app refuses to start rather than overwrite it.
export function load(dir) {
  let text;
  try { text = readFileSync(fileIn(dir), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  if (!text.trim()) return [];
  let data;
  try { data = JSON.parse(text); }
  catch (error) { throw new Error(`${fileIn(dir)} is not valid JSON (${error.message}). Fix or move it away; it was not changed.`); }
  if (!Array.isArray(data)) throw new Error(`${fileIn(dir)} is not a list of bookings. Fix or move it away; it was not changed.`);
  return data;
}

// Synchronous so no other request runs between a change and its save. Writes a temp file then renames it,
// so a crash leaves either the old or the new file, never half of one.
export function save(dir, bookings) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const temp = `${fileIn(dir)}.tmp`;
  const fd = openSync(temp, 'w', 0o600);
  try {
    writeSync(fd, JSON.stringify(bookings));
    fsyncSync(fd);
  } finally { closeSync(fd); }
  renameSync(temp, fileIn(dir));
}
