# Math Playground

Four calm math games for autistic learners, part of **The Learning Toolshed**.
Live at <https://swankymcgee.github.io/math-playground/>.

Open `index.html` in Chrome by double-clicking it — no server, no install, no
admin rights. Nothing is fetched on load; the only network request is the link
back to the Toolshed site, and only when someone clicks it.

## The games

| File | Game | What the student does |
| --- | --- | --- |
| `counters.html` | **Counters** | A virtual ten-frame. Drag counters in and out of the frames (a plain tap works too), then press Check. Numbers stay small — up to 20 — and the tray always carries **3–5 spare counters** as well, so the student counts the ones they need instead of dragging the whole pile in. |
| `number-line.html` | **Number Line** | Drag the hopper or tap the big + / − buttons. The badge above shows how far it has moved from the start (−3, +7, 0). Land on the answer and the hopper goes see-through with an outline while a magnifier shows the number up close. The choices unlock only when the hopper reaches the landing. |
| `facts.html` | **7+5 Facts** | One fact at a time with three big choices and a Hint button. |
| `story.html` | **Story Problems** | Short picture stories with scene icons and a proportional bar model. |

Every game has a **grade level** picker (K–12, in CCSS bands) and a **math
operations** picker. Operations that do not apply to a game at the selected
grade are disabled with a plain-language label such as
"Multiplying — not for Grade 2".

## Scoring rules

- The score counts **successes only** — a problem solved with a correct answer.
- **Skips and reveals never add to it.** After two wrong tries the answer is
  shown kindly; that problem earns nothing.
- The score never goes down, there is no timer, and there is no failure screen.
- Wrong answers are deliberately silent: neutral text, the choices stay put.
- After five problems a congrats screen shows the round result
  ("You got 4 of 5 right this round."), the saved total, and
  **Play again?**
- The total is saved between sessions, so it is shared across all four games.

## Files

- `math.js` — shared engine: palettes, grade/operation tables, the round
  runner, the setup pickers, header/footer injection, and the Web Audio chimes.
- `math.css` — all styling, including the 11 color palettes, the score and
  congrats screens, drag styles, and the background-motif off-toggle.
- `index.html` — home page: hero, setup pickers, the four game cards, and a
  "Continue" strip for whichever game was played last.

## Things to keep in sync

**`THEMES` is mirrored by hand.** The 11 palette ids (`calm`, `lavender`,
`mint`, `peach`, `rose`, `ocean`, `low`, `high`, `dark`, `midnight`, `warm`)
must match the copies in:

- `SwankyMcGee.github.io/site.js`
- `work-cycle-timer/app.js` (the timer's copy)

All three read the same `localStorage` key `workCycleTimer.settings.v1`, so a
palette picked here shows up on the site and in the timer, and vice versa.

**Dark palettes are `dark`, `midnight`, `warm`, `low`.** Any new dark palette
must be added to the dark-palette selectors in `math.css` (and in the site's
`site.css` if it ever gets a logo image).

**Play settings** live in `localStorage["workCycleTimer.math.v1"]` as
`{ grade, ops, sound, last, score }` — a separate key on purpose, so the timer
and the site never read fields they do not know.

**Number ranges** come from `GAME_CEILING` in `math.js` and are clamped against
the grade's own range (the setup note prints whichever is smaller). Counters is
deliberately capped at **20** so the numbers stay small — that keeps the
dragging to a minimum. Its tray also carries **3–5 spares** (`SPARE_MIN` /
`SPARE_MAX` in `counters.html`) that are not part of the problem, and the
frames are sized to hold `answer + spares`, so a wrong guess still fits
(three ten-frames at most).

## Notes

- All artwork is **inline SVG** so it recolors with the palette. There is no
  image file to load and no image generator in this project — if new art is
  wanted, draw it as SVG.
- Sound is Web Audio only (two notes on a correct answer, an arpeggio when the
  round ends) and **never starts on page load**. The 🔊 button turns it off.
- The sensitive buttons (Skip, sound, Home, palette-free chrome controls) are
  hold-to-activate: 1 second, or 3 seconds for settings-style controls.
- Background motifs are home-page only and have an **Off** toggle in the
  palette menu.
- **One small same-origin script**: when served from the hub, `math.js` loads
  `our-day/ourday-notify.js` so Our Day's gentle reminders can show a top-right
  notice here too. Opened from disk (`file:`) no request is ever made — the tool
  stays fully offline.

## Publishing

```powershell
git add -A
git commit -m "Your change"
git push
```

GitHub Pages serves this repo's `main` branch from the root, so the site
updates about a minute after the push. Check with:

```powershell
gh api repos/SwankyMcGee/math-playground/pages/builds/latest
```
