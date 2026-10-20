# M1.7 validation — front page

- Coder: a Claude subagent (Opus 5.5) that the milestone lead started with the Agent tool. It ran in the worktree `wt-m1.7` on branch `m1.7-front-page`, using the `ponytail` skill.
- Base: `main` at `279eb160bc10e3c56f27142da66ff0acf1aac3b1` (brief commit `22a9d08` on top).
- Implementation head: `7c0fe62a7af7e3294f22363a6213a91bcf82e68b`.
- Changed: `public/index.html` only. No changes to CSS, server or tests. It reuses the starter classes (`header`, `.wordmark`, `.status`, `.eyebrow`, `h1`, `.intro`, `.steps`, `.number`, `footer`) plus `.slots` and `.action` for the two table links, which stack in a grid with a gap.
- Node: `v22.23.3`, from the scratchpad Node 22 tarball on PATH.

## Commands and results

| Command | Result |
|---|---|
| `npm ci` | ok, 0 vulnerabilities (there are no dependencies) |
| `TZ=UTC npm test` | 46 tests: 46 pass, 0 fail |
| `TZ=Europe/Berlin npm test` | 46 tests: 46 pass, 0 fail |
| `PORT=3177 HOST=127.0.0.1 node server.mjs`, then curl | `/` 200, `/table/1` 200, `/table/2` 200, `/api/health` 200, `/table/3` 404. The server was stopped afterwards. |
| `grep -ci "vibecode\|workshop\|Check this app\|intra.land" public/index.html` | 0 |

## Browser evidence

I used headless Google Chrome (`--headless=new`, `--user-data-dir` under /tmp). Screenshots are in `/tmp/m17-shots/` and are not committed: `home-1280x800.png`, `home-390x844.png`, plus `table1-390x844.png` for comparison. I looked at all three.

I measured over CDP (`/tmp/m17-scripts/measure.mjs`) with device-metrics emulation:

| Viewport | scrollWidth / clientWidth | `/table/1` link | `/table/2` link | Smallest text |
|---|---|---|---|---|
| 1280×800 | 1265 / 1265 | 145×51 px | 145×51 px | 12px (the "2 tables" pill) |
| 390×844 | 390 / 390 | 145×51 px | 145×51 px | 12px (the "2 tables" pill) |

So neither width scrolls sideways, and both table links are taller than 44px. The palette, system font and the orange `#ff8b54` accent are the same as on the table pages. On phones the three steps stack into one column.

## Acceptance mapping

- [x] Name and description: the `h1` and wordmark read "Ping Pong 42", the intro reads "Book a table tennis slot at 42 Heilbronn, or join an open game.", the `<title>` is "Ping Pong 42 · Table tennis at 42 Heilbronn", and the meta description repeats the intro sentence. Checked in the source and the screenshots.
- [x] Two tappable links: `/table/1` and `/table/2`, each 145×51 px. Both targets return 200.
- [x] Three steps: pick a table (QR code or the links above), book with your 42 login or join a game with spots left, then play and find each other through intra profile links. The page makes no claims about notifications or sign-in.
- [x] No starter leftovers: the grep above returns 0, and the footer now reads "Ping Pong 42 · 42 Heilbronn" with no health link.
- [x] Phone and desktop: see the table above.
- [x] Existing behaviour: both TZ test runs are green, including the `/` test. `/api/health`, the table pages and the 404 page are unchanged, because server.mjs and style.css were not touched.

## Skipped or limited

- I didn't click through in a real phone browser. The phone check used headless Chrome with mobile emulation only, and there was no hosted check.
- Step 03 mentions intra profile links. They come with M1.4, which is still in progress and not yet on main, so until M1.4 merges this line runs ahead of the table pages.
- The header wordmark link (`/`) is 16px tall. It's the existing starter style, it links to the page you're already on, and it isn't one of the primary tap targets, so I left it unchanged.
- I didn't run a separate check that the 404 page is unchanged beyond the status code. The server code is untouched.
