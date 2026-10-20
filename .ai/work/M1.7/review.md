# M1.7 review

Base SHA: 279eb160bc10e3c56f27142da66ff0acf1aac3b1
Head SHA: ef89da0a77349e13717c9fa7656635367075c9ff
Reviewer session/provider: Codex CLI (codex exec, OpenAI model family), dispatched by the Claude milestone lead

## What I checked

Independently read AGENTS.md, the reviewer role, review template, IDEA.md, PLAN.md, .ai/rules.md, the step brief and coder validation. I did not write the implementation. `git rev-parse HEAD` confirmed the full head above; initial `git status --short` was clean. Inspected the entire `git diff BASE HEAD`, including evidence files, and the complete HTML and shared CSS. Only public/index.html and the step brief/validation differ. `git diff --exit-code BASE HEAD -- server.mjs test scripts package.json package-lock.json public/style.css` passed: these files are unchanged. `git diff --check BASE HEAD` passed.

All Node commands used the supplied Node 22.23.3 directory prefixed to PATH:

| Command / check | Observed result |
|---|---|
| `npm ci` | Success; 0 vulnerabilities, no dependencies added |
| `TZ=UTC npm test` | 46 passed, 0 failed, 0 skipped |
| `TZ=Europe/Berlin npm test` | 46 passed, 0 failed, 0 skipped |
| `PORT=3188 HOST=127.0.0.1 node server.mjs` | App started from this worktree; stopped after review |
| `curl -sS -o ... -w ... http://127.0.0.1:3188/` and `/table/1`, `/table/2`, `/table/3`, `/api/health`, `/style.css` | Respectively 200 HTML, 200 HTML, 200 HTML, 404 HTML, 200 JSON, 200 CSS. Health body: `{"ok":true,"revision":"development"}` |
| `rg -n 'vibecode\|workshop\|Check this app\|intra.land' public/index.html` | No matches |

Acceptance mapping:

- [x] Name, one-line description, title and meta description match Ping Pong 42 and table tennis at 42 Heilbronn.
- [x] Two clearly named table links. Independently clicked both using Chrome CDP mouse input at both viewport sizes; each navigated to the matching table page.
- [x] Three ordered steps explain picking/scanning, booking/joining with a typed 42 login, and meeting through intra profiles. No sign-in, notification or live-update claims. Joining and profile links are upcoming M1.4 work, as explicitly allowed by this review request; they are not functional in this reviewed head. This is not evidence that M1.4 works.
- [x] Starter wording and external workshop/health links are absent from the landing page.
- [x] Inspected fresh headless Chrome screenshots of `/` and `/table/1` at 1280×800 and 390×844. The shared dark background, system fonts and orange accent are consistent; text is readable and steps stack on phone. Vertical scrolling is expected.
- [x] Existing behavior is covered by both test runs and route probes, with server, CSS and tests unchanged in the committed range.

Browser command: `google-chrome --headless=new --no-sandbox --disable-gpu --remote-debugging-port=9397 --user-data-dir=/tmp/m17-independent-review/chrome about:blank`, driven by `node /tmp/m17-independent-review/browser.mjs` using Node's WebSocket/CDP. Screenshots inspected: `/tmp/m17-independent-review/home-1280.png`, `home-390.png`, `table1-1280.png`, `table1-390.png`. Chrome was stopped afterwards. Chrome emitted environment/service warnings but rendered and navigation succeeded.

| Viewport | document scrollWidth / clientWidth | Table 1 and Table 2 targets |
|---|---|---|
| 1280×800 | 1265 / 1265 | Each 144.73×51 CSS px |
| 390×844 | 390 / 390 | Each 144.73×51 CSS px |

HTML basics checked in source: doctype, `lang="en"`, charset, viewport, descriptive title/description, one h1, ordered h2 steps, main landmark, valid list/link structure. Link text identifies each destination; decorative arrows are aria-hidden. Keyboard Tab showed a visible 3px orange focus outline. The shared `a:focus-visible` rule covers all three links. Calculated contrast from stylesheet colors against #15171c: primary text 15.49:1, secondary text 8.68:1, accent/focus 7.75:1; button dark text on orange also 7.75:1.

Skipped/limits: no hosted acceptance, physical phone, screen reader, external HTML validator or full automated accessibility audit. Did not exercise booking/joining mutations because this is a static landing-page change and M1.4 is absent. Screenshots show the initial viewport; lower-page copy/footer were checked in source. No deployment performed. Only this review file was modified, per the explicit assignment; no context/session files, commits, pushes or merges.

## Findings

- **Low, non-blocking — public/index.html:11:** The inherited wordmark home link is 216×16px, below the brief's approximate 44px tap-target guidance. Both primary navigation targets exceed 44px, and this small link only reloads the current landing page, so it does not obstruct the requested journey. A future polish change could increase its clickable padding/minimum height.
- No blocking defects found. No additional taste changes requested.

## Verdict

APPROVE. The static page meets the front-page outcome, the primary journey works at both sizes, and required regression checks pass. Approval covers only ef89da0a77349e13717c9fa7656635367075c9ff, with the disclosed minor inherited home-link target limitation and upcoming M1.4 copy dependency. It does not approve an unobserved hosted journey or certify M1.4 functionality.
