# M1.9 validation — one tap to book or join

- Coder: a fresh Claude Code subagent (Opus 5.5) dispatched by the M1.9 milestone lead through the Agent tool. It used `ponytail:ponytail` and `superpowers:test-driven-development`. It did not write the brief or earlier code.
- Branch `m1.9-one-tap`, worktree `.../scratchpad/wt-m1.9`.
- Base: `4baee8c6098850c3addd7e718a3665dd5b3ffa77` (approved M1.8 head), brief commit `f54f570`.
- Implementation commit: `95c18df6ed3a7c7300eb8f69dd4ed5efc4c0c803`.
- Merged `origin/main` (`37c35b9`, PR #9 "M1.8") into the branch as `4ee6609`. The merge brought only `.ai/work/M1.8/review.md`. Tests were rerun after the merge.
- Head for review: the commit that adds this file (on top of `4ee6609`). Review the diff `37c35b9..HEAD`.
- Node: v22.23.3 (`PATH=.../scratchpad/node-v22.23.3-linux-x64/bin:$PATH`).

## What changed

- `server.mjs`
  - The table view has one settings form, `<form id="tap" action="/book">`, below the date. It holds the hidden table, Login, Singles|Doubles and "Players with me" (default 1).
  - Every free, not-ended slot has `<button form="tap" name="time" value="HH:MM">Book</button>`. Every open game the browser is not already in has the same button with `formaction="/join"` and the label Join. There are no `<details>` panels and no time dropdown. The buttons sit outside the form and point at it with `form="tap"`, so the Cancel and Leave forms in the rows stay ordinary forms and nothing is nested.
  - The form's first submit button is `disabled hidden`. That makes it the form's default button, so pressing Enter in the Login field submits nothing. Without it, Enter would book the first free slot.
  - Rows owned by this browser start with **You booked** or **You joined**, then the status and the profile links as before. They show Cancel booking or Leave as LOGIN and no Join button. Others are still `profile.intra.42.fr` links.
  - The remembered login: after a successful `/book` or `/join`, the response also sets `login=<login>; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`. The value has already passed `loginOf` (`[A-Za-z0-9-]{1,32}`). On GET, the login is read from the cookie only if it matches that pattern, and it is always escaped when rendered.
    - Why a cookie: it is the smallest change. There is no new server state and no persistence change, and it works without JavaScript.
    - It is never used for ownership. Cancel and leave still compare only the `browser` cookie.
  - When a tap is refused, the page re-renders with what was posted: the login (escaped), Singles/Doubles and the group size. When a cancel or leave is refused and there is no login in the form, the field falls back to the remembered login.
  - The login refusal message now reads "Enter your 42 login in the Login field at the top: letters, digits and hyphens only, no spaces."
  - Validation, ownership checks, `persist()` and the `/book` and `/join` field contracts are unchanged.
- `public/style.css`
  - Removed the details, summary and panel styles. Added a compact settings bar: sticky, solid background, segmented Singles|Doubles, a 44px login input and a players input.
  - Book is a solid orange pill and Join an orange outline pill, both at the right of the row. On owned rows, Cancel and Leave drop under the text, so the text isn't squeezed into a narrow column.
  - Ended rows are smaller (1.75rem). On desktop the settings bar is a card inside the 34rem column.
  - Same palette. `--bg` and `--fg` are now variables.
- Tests
  - `test/tap.test.mjs`: the M1.8 panel assertions are replaced with one-tap assertions. The intent is kept: one Book per free slot, Join per open game, none on full or ended slots, no time dropdown, and junk queries are safe.
  - `test/book.test.mjs`: one markup assertion is updated to match Book buttons instead of per-slot forms. The intent is the same.
  - New `test/remember.test.mjs` (8 tests).

## TDD

- I wrote the new and changed tests first and ran them against the M1.8 server: 7 of the 11 tests in tap and remember failed, for the expected reasons (no `#tap` form, no `login` cookie, the old message, no "You booked"). Two tests, "refused action does not remember" and "invalid cookie never rendered", are guards that pass by construction before and after.
- I then implemented. `book.test.mjs`'s old form-markup test went red because the markup changed legitimately, and I updated it.
- I added the refused-cancel fallback test later and watched it fail with the fallback removed: 1 fail. Then it passed.

## Commands and results

```
npm ci                         -> found 0 vulnerabilities (no dependencies)
TZ=UTC npm test                -> tests 87, pass 87, fail 0, skipped 0   (before and after merging origin/main)
TZ=Europe/Berlin npm test      -> tests 87, pass 87, fail 0, skipped 0   (before and after merging origin/main)
```

`/api/health`, `package.json`, `scripts/` and `test/deploy.test.mjs` are untouched.

## Browser journey

Scripts: `/tmp/m19/launch.mjs` and `/tmp/m19/journey.mjs`.

- The launcher calls `createApp` with a fixed clock, `2026-10-20T10:00:00Z` (12:00 Berlin), and `VC_DATA_DIR=/tmp/m19/data-<run>`.
- The journey drives headless `/usr/bin/google-chrome` over CDP. It uses two `--user-data-dir` profiles (A and B) under `/tmp/m19/`, real mouse events and `Input.insertText`.
- Runs:
  - `node journey.mjs 390 844 mobile`
  - `node journey.mjs 1280 800`
  - `NOJS=1 node journey.mjs 390 844 mobile`
  - `NOJS=1 node journey.mjs 1280 800`
- The no-JS runs call `Emulation.setScriptExecutionDisabled(true)` on both profiles. The driver's own `Runtime.evaluate` still reads the DOM.
- Logs: `/tmp/m19/run-*.log`. Screenshots: `/tmp/m19/<size>[-nojs]-*.png`, 32 files.
- The driver killed only its own child PIDs (the app and the two Chromes).

All four runs gave identical results:

1. A opens `/`.
   - Table 1 is current. The login is empty, with 0 `<details>`, 0 `<select>` and 12 Book buttons.
   - A switches to Table 2 (`/table/2`).
2. A taps Book on 14:00 with the login empty. Chrome's `required` validation blocks the submit ("Please fill out this field."), the URL is unchanged and no bookings file exists. The server-side refusal of an empty login is covered by HTTP tests, because the browser never sends one.
3. A types `jwosylu` and presses Enter in the Login field. Nothing is submitted: the URL is unchanged and no bookings file exists.
4. Singles and 1 are the defaults. A taps Book on 14:00.
   - The result is `/table/2?booked=14:00` with the notice "Booked 14:00. See you at the table!".
   - The row reads `You booked · 1 of 2 spots left · jwosylu`, with the Cancel booking button.
5. A reloads `/table/2`. The login field is prefilled with `jwosylu`. A taps Book on 15:00, gets `/table/2?booked=15:00`, and the 15:00 row reads `You booked · 1 of 2 spots left`. That is a second one-tap booking.
6. B opens `/table/2`.
   - B's login is empty, and 14:00 shows `1 of 2 spots left · jwosylu` with Join only.
   - B types `ben42` and taps Join. The result is `/table/2?joined=14:00` with the notice "Joined 14:00. See you at the table!".
   - 14:00 is now `full` and reads `You joined · Full · jwosylu, ben42`, with only "Leave as ben42".
   - On B's reload, the login is prefilled with `ben42`.
7. A reloads and sees `ben42` as a link to `https://profile.intra.42.fr/users/ben42`. The 14:00 row reads `You booked · Full · jwosylu, ben42`, with Cancel booking and no Join.
8. The saved `bookings.json` holds exactly two table-2 bookings: 14:00 (jwosylu plus joined ben42, different browser ids) and 15:00 (jwosylu).

Layout measurements cover the switch links, the settings inputs, the segment labels and all row buttons. They were taken on the home page, after the booking, after the join and in the final state:

| Run | scrollWidth / clientWidth | Smallest control (h / w) | Controls under 44px |
|---|---|---|---|
| 390x844 | 390 / 390 | 44 / 56 | none |
| 1280x800 | 1265 / 1265 (vertical scrollbar), final 1280 / 1280 | 44 / 56 | none |
| 390x844, no JS | 390 / 390 | 44 / 56 | none |
| 1280x800, no JS | 1265 / 1265, final 1280 / 1280 | 44 / 56 | none |

I looked at the screenshots and iterated three times:

- Owned rows squeezed their text into a narrow column beside the wide "Cancel booking" button. The button now drops under the text.
- The sticky bar's translucent blur let the orange buttons glow through. It now has a solid background.
- At desktop the one-row settings bar overflowed the 34rem column (an early run measured 811 against 780). It now keeps the two-row layout as a card.

Final state:

- Phone: a compact sticky bar (Login, then Singles|Doubles and Players with me), small dimmed ended rows, and free rows with a right-aligned orange Book.
- Desktop: a centred column with the settings card.

## Acceptance mapping

| Acceptance | Check |
|---|---|
| Set once at top; one Book per free slot; one Join per open game; no panels or dropdown; no-JS | tap.test "one Book button … one Join button" and "no time dropdown and no per-slot panel"; journey steps 1, 4, 5 and 6 in all four runs, including no JS |
| Remembered login, prefilled, escaped, not ownership | remember.test "successful book remembers…", "successful join remembers…", "refused action does not remember", "invalid remembered login never rendered", "login cookie alone grants nothing" (no Cancel or Leave with a login cookie only, and `/cancel` with only `login=jwosylu` returns 403); journey steps 5 and 6 |
| Empty or invalid login refused, message points at the top field, nothing booked, typed values kept | remember.test "empty login on one tap…" (Book and Join, 400, message, spots=4 and players=2 kept, bookings still empty) and "refused tap keeps what the player typed, escaped"; existing book.test and join.test refusal tables; journey step 2 (client-side `required`) |
| Ownership labels; others as profile links | remember.test "rows owned by this browser say so"; journey steps 4, 6 and 7 |
| Full and ended slots have no Book or Join; ended rows compact | tap.test per-row assertions; screenshots `*-A1-home.png` |
| Validation, ownership and persistence unchanged; M1.3, M1.4 and M1.5 tests pass | full suite 87/87 in both time zones; the only existing test edited is one markup regex in book.test |
| Clean and polished, 44px targets, no horizontal scroll, sticky compact bar | measurement table and the screenshots above |
| Two-profile journey at both widths, fixed clock, a no-JS run | the four runs above |
| `npm test` in UTC and Berlin; health and deploy contract unchanged | Commands section |

## Skipped and limits

- No hosted or deploy check, no physical phone, and no Safari or Firefox. `form=` and `formaction` are standard HTML and widely supported, but I didn't check them outside Chrome.
- No restart or persistence rerun in the browser. Persistence code is unchanged, and the M1.5 persistence tests pass.
- I took no screenshot of the server's empty-login refusal page, because the browser's `required` check stops the request first. That page is covered by HTTP tests.
- Only the login is remembered. Singles|Doubles and the group size reset to Singles and 1 on a fresh visit, but are kept on a refused submit.
- A browser that changes its login keeps its earlier bookings, which is unchanged behaviour. The remembered login cookie is overwritten by the latest successful book or join.
