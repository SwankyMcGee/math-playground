/* ============================================================
   Math Playground — shared chrome, palettes, grade/operation
   settings, and problem generators for the four games.

   Palettes: the same 11 as the Work Cycle Timer and the
   Toolshed site. This script applies the shared theme
   (localStorage["workCycleTimer.settings.v1"].theme) before
   first paint and injects the header picker. Keep THEMES in
   sync with app.js (timer) and site.js (site).

   Play settings (grade, operations, sound, last game) live in
   localStorage["workCycleTimer.math.v1"] — a separate key so
   the timer and site never see fields they don't know.

   Design rules (from the research on autistic learners):
   no timers, no failure states, no score that can ever go down;
   gentle feedback; one action at a time; player-paced; visible.
   ============================================================ */

'use strict';

/* Right-click menu off: holding a hold button is read as a long-press by
   some touchscreens, which pops the context menu over the button. */
document.addEventListener('contextmenu', (e) => e.preventDefault());

const STORAGE_KEY = 'workCycleTimer.settings.v1';   // shared: theme + motifs
const MATH_KEY = 'workCycleTimer.math.v1';          // ours: grade, ops, sound, last

/* Same 11 palettes as the timer's Settings → Display (app.js THEMES).
   chips = [page background, surface, text, accent, second accent]. */
const THEMES = [
  { id: 'calm',     name: 'Calm (soft blue & green)',   chips: ['#f2f6f8', '#ffffff', '#33414d', '#4d84a6', '#628f5d'] },
  { id: 'lavender', name: 'Lavender (soft purple)',     chips: ['#f5f3fb', '#ffffff', '#3d3a52', '#7a6fc0', '#6a9a76'] },
  { id: 'mint',     name: 'Mint (fresh green)',         chips: ['#eef8f3', '#ffffff', '#2f4640', '#35837e', '#6f9a58'] },
  { id: 'peach',    name: 'Peach (warm apricot)',       chips: ['#fdf6ef', '#fffdfb', '#4d3f34', '#c26a3c', '#7a9a5a'] },
  { id: 'rose',     name: 'Rose (soft pink)',           chips: ['#fdf4f6', '#ffffff', '#4f3540', '#c25f7e', '#6f9466'] },
  { id: 'ocean',    name: 'Ocean (aqua blue)',          chips: ['#eef8fa', '#ffffff', '#2c4750', '#2f87a3', '#5f9a6a'] },
  { id: 'low',      name: 'Low contrast (very gentle)', chips: ['#eef1f3', '#f6f8f9', '#5b6570', '#94b4c3', '#a9c5a5'] },
  { id: 'high',     name: 'High contrast',              chips: ['#000000', '#0b0d10', '#ffffff', '#56e0ff', '#b7ff5e'] },
  { id: 'dark',     name: 'Dark (slate)',               chips: ['#151a20', '#1e242b', '#e7edf2', '#6fa9c7', '#8fbf88'] },
  { id: 'midnight', name: 'Midnight (deep blue)',       chips: ['#0a0f1e', '#121a30', '#e3e9f7', '#6fa8ff', '#67d6a5'] },
  { id: 'warm',     name: 'Warm dark (sepia)',          chips: ['#211a14', '#2b221a', '#f0e6da', '#d9a05f', '#93b877'] }
];

/* ---------- Grade bands ----------
   addMax = the biggest sum/minuend this grade practices.
   mulMax = the biggest product (also bounds exact division).
   limit  = biggest factor for × and ÷.
   Multiplying and dividing start in Grade 3 (CCSS 3.OA);
   K–2 chips are disabled with a visible note. */
const GRADES = [
  { id: 'k',   name: 'K',      addMax: 10,     mulMax: 0,   limit: 0,  ops: ['add', 'sub'] },
  { id: '1',   name: '1',      addMax: 20,     mulMax: 0,   limit: 0,  ops: ['add', 'sub'] },
  { id: '2',   name: '2',      addMax: 100,    mulMax: 0,   limit: 0,  ops: ['add', 'sub'] },
  { id: '3',   name: '3',      addMax: 1000,   mulMax: 100, limit: 10, ops: ['add', 'sub', 'mul', 'div'] },
  { id: '4',   name: '4',      addMax: 10000,  mulMax: 144, limit: 12, ops: ['add', 'sub', 'mul', 'div'] },
  { id: '5',   name: '5',      addMax: 100000, mulMax: 144, limit: 12, ops: ['add', 'sub', 'mul', 'div'] },
  { id: '6',   name: '6',      addMax: 100000, mulMax: 400, limit: 20, ops: ['add', 'sub', 'mul', 'div'] },
  { id: '7',   name: '7',      addMax: 100000, mulMax: 400, limit: 20, ops: ['add', 'sub', 'mul', 'div'] },
  { id: '8',   name: '8',      addMax: 100000, mulMax: 400, limit: 20, ops: ['add', 'sub', 'mul', 'div'] },
  { id: '9-12', name: '9–12',  addMax: 100000, mulMax: 400, limit: 20, ops: ['add', 'sub', 'mul', 'div'] }
];

const OPS = [
  { id: 'add', symbol: '+', name: 'Adding',      word: 'plus' },
  { id: 'sub', symbol: '−', name: 'Subtracting', word: 'minus' },
  { id: 'mul', symbol: '×', name: 'Multiplying', word: 'times' },
  { id: 'div', symbol: '÷', name: 'Dividing',    word: 'divided by' }
];

/* What each game can draw — the generator clamps to
   min(grade range, game ceiling) and the page says so. */
const GAME_CEILING = {
  counters: { add: 20, sub: 20 },                    // two ten-frames at most —
                                                     // fewer counters to drag
  line:     { add: 100, sub: 100, mul: 100, div: 100 },  // a readable axis
  facts:    { add: Infinity, sub: Infinity, mul: Infinity, div: Infinity },
  story:    { add: 1000, sub: 1000, mul: 144, div: 144 }
};

/* Which operations each game can play. The setup bar disables the
   rest on that game's page (and the note says what it plays). */
const GAME_OPS = {
  counters: ['add', 'sub'],
  line:     ['add', 'sub', 'mul', 'div'],
  facts:    ['add', 'sub', 'mul', 'div'],
  story:    ['add', 'sub', 'mul', 'div']
};

/* ---------- Shared settings (theme + motifs) ---------- */

function readTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && THEMES.some((t) => t.id === s.theme)) return s.theme;
    }
  } catch (err) { /* storage blocked — fall through */ }
  return 'calm';
}

/* Patch single fields of the shared setting, never overwrite the
   rest (the timer's durations, music, etc.). */
function patchSettings(fields) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const s = raw ? JSON.parse(raw) : {};
    if (!s || typeof s !== 'object') return false;
    Object.assign(s, fields);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return true;
  } catch (err) {
    return false;
  }
}

function writeTheme(id) { return patchSettings({ theme: id }); }

function motifsOn() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.homeMotifs === false) return false;
    }
  } catch (err) { /* default on */ }
  return true;
}

function syncMotifs() {
  const on = motifsOn();
  document.documentElement.classList.toggle('motifs-off', !on);
  const btn = document.getElementById('motifBtn');
  if (btn) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    const state = document.getElementById('motifState');
    if (state) state.textContent = on ? 'On' : 'Off';
  }
}

function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  syncPicker(id);
}

function syncPicker(id) {
  const panel = document.getElementById('themePanel');
  if (!panel) return;
  for (const row of panel.querySelectorAll('.theme-opt')) {
    const on = row.dataset.theme === id;
    row.classList.toggle('active', on);
    row.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

function closePanel() {
  const panel = document.getElementById('themePanel');
  const btn = document.getElementById('themeBtn');
  if (panel) panel.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function togglePanel() {
  const panel = document.getElementById('themePanel');
  const btn = document.getElementById('themeBtn');
  if (!panel) return;
  const opening = panel.hidden;
  panel.hidden = !opening;
  if (btn) btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
}

/* Build the header 🎨 button + panel once the header exists. */
function injectPicker() {
  const head = document.querySelector('.site-head');
  if (!head || document.getElementById('themeWrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'theme-wrap';
  wrap.id = 'themeWrap';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-btn';
  btn.id = 'themeBtn';
  btn.setAttribute('aria-haspopup', 'true');
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'Change the color palette';
  btn.setAttribute('aria-label', 'Change the color palette');
  btn.innerHTML = '<span aria-hidden="true">\uD83C\uDFA8</span><span>Palette</span>';

  const panel = document.createElement('div');
  panel.className = 'theme-panel';
  panel.id = 'themePanel';
  panel.hidden = true;
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Color palettes');

  for (const t of THEMES) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'theme-opt';
    row.dataset.theme = t.id;
    row.setAttribute('aria-pressed', 'false');

    const name = document.createElement('span');
    name.className = 'theme-name';
    name.textContent = t.name;

    const chips = document.createElement('span');
    chips.className = 'theme-chips';
    chips.setAttribute('aria-hidden', 'true');
    for (const hex of t.chips) {
      const chip = document.createElement('span');
      chip.className = 'theme-chip';
      chip.style.background = hex;
      chips.appendChild(chip);
    }

    row.append(name, chips);
    row.addEventListener('click', () => {
      writeTheme(t.id);
      applyTheme(t.id);
      closePanel();
    });
    panel.appendChild(row);
  }

  /* Background patterns switch — same homeMotifs setting as the
     site's home page, so one switch runs both. */
  const motifBtn = document.createElement('button');
  motifBtn.type = 'button';
  motifBtn.className = 'motif-btn';
  motifBtn.id = 'motifBtn';
  motifBtn.setAttribute('aria-pressed', 'true');
  motifBtn.title = 'Gentle background patterns on the home page';
  const motifLabel = document.createElement('span');
  motifLabel.textContent = 'Background patterns';
  const motifState = document.createElement('span');
  motifState.className = 'motif-state';
  motifState.id = 'motifState';
  motifState.textContent = 'On';
  motifBtn.append(motifLabel, motifState);
  motifBtn.addEventListener('click', () => {
    patchSettings({ homeMotifs: !motifsOn() });
    syncMotifs();
  });
  panel.appendChild(motifBtn);

  btn.addEventListener('click', togglePanel);
  wrap.append(btn, panel);
  head.appendChild(wrap);

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) closePanel();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  syncPicker(readTheme());
  syncMotifs();
}

/* ---------- Play settings (grade, operations, sound, last) ---------- */

function defaultPlay() {
  return { grade: '2', ops: ['add', 'sub'], sound: true, last: '', score: 0 };
}

function readPlay() {
  let p = defaultPlay();
  try {
    const raw = localStorage.getItem(MATH_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') p = Object.assign(p, s);
    }
  } catch (err) { /* storage blocked — defaults */ }

  if (!GRADES.some((g) => g.id === p.grade)) p.grade = '2';
  const grade = GRADES.find((g) => g.id === p.grade);
  if (!Array.isArray(p.ops)) p.ops = ['add', 'sub'];
  /* Keep only operations this grade offers; never leave an empty
     set (the page falls back to adding). */
  p.ops = p.ops.filter((o) => grade.ops.includes(o));
  if (!p.ops.length) p.ops = grade.ops[0] === 'add' ? ['add'] : ['add', 'sub'];
  p.sound = p.sound !== false;
  if (typeof p.last !== 'string') p.last = '';
  if (typeof p.score !== 'number' || !isFinite(p.score) || p.score < 0) p.score = 0;
  p.score = Math.round(p.score);
  return p;
}

function patchPlay(fields) {
  const p = Object.assign(readPlay(), fields);
  /* Re-validate after the merge (a grade change can invalidate ops). */
  const grade = GRADES.find((g) => g.id === p.grade);
  p.ops = (Array.isArray(p.ops) ? p.ops : []).filter((o) => grade.ops.includes(o));
  if (!p.ops.length) p.ops = ['add'];
  try { localStorage.setItem(MATH_KEY, JSON.stringify(p)); } catch (err) { /* private mode */ }
  return p;
}

/* Score: successes only. A skip or a reveal never adds to it. */
function bumpScore() {
  const score = readPlay().score + 1;
  patchPlay({ score });
  return score;
}

function gradeInfo(id) {
  return GRADES.find((g) => g.id === id) || GRADES[2];
}

function opInfo(id) {
  return OPS.find((o) => o.id === id) || OPS[0];
}

/* The range this game will actually play: min(grade, ceiling). */
function playCeiling(gameId, opId, gradeId) {
  const g = gradeInfo(gradeId);
  const cap = (GAME_CEILING[gameId] || {})[opId];
  if (opId === 'mul' || opId === 'div') {
    const gradeVal = g.mulMax;
    if (!gradeVal) return 0;
    return Math.min(gradeVal, cap === undefined ? Infinity : cap);
  }
  return Math.min(g.addMax, cap === undefined ? Infinity : cap);
}

/* ---------- Gentle sound (Web Audio — never starts on load) ---------- */

let actx = null;

function soundOn() { return readPlay().sound; }

function ensureAudio() {
  if (!soundOn()) return null;
  try {
    if (!actx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      actx = new Ctx();
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch (err) {
    return null;
  }
}

function tone(ctx, freq, at, dur, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, ctx.currentTime + at);
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + at + 0.02);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + at);
  osc.stop(ctx.currentTime + at + dur + 0.05);
}

/* correct = soft two-note rise; done = small arpeggio; wrong is
   deliberately silent (no failure sound — ever). */
function chime(kind) {
  const ctx = ensureAudio();
  if (!ctx) return;
  if (kind === 'correct') {
    tone(ctx, 660, 0, 0.14, 0.07);
    tone(ctx, 880, 0.12, 0.18, 0.06);
  } else if (kind === 'done') {
    tone(ctx, 523, 0, 0.14, 0.07);
    tone(ctx, 659, 0.13, 0.14, 0.07);
    tone(ctx, 784, 0.26, 0.24, 0.06);
  } else if (kind === 'reveal') {
    tone(ctx, 523, 0, 0.16, 0.05);
    tone(ctx, 659, 0.14, 0.2, 0.045);
  }
}

/* ---------- Hold-to-activate (kid-safe buttons) ----------
   Same helper as the timer: a continuous press for `ms`
   milliseconds; releasing early does nothing. Works with mouse,
   touch and keyboard (Enter / Space held down). */

function makeHoldable(el, ms, action) {
  let timeout = null;
  let busy = false;   // stays true after firing until release

  function start(e) {
    if (busy) return;
    if (e.type === 'pointerdown' && typeof e.button === 'number' && e.button !== 0) return;
    busy = true;
    el.classList.add('holding');
    timeout = setTimeout(() => {
      timeout = null;
      el.classList.remove('holding');
      action();
    }, ms);
  }

  function cancel() {
    if (timeout) { clearTimeout(timeout); timeout = null; }
    busy = false;
    el.classList.remove('holding');
  }

  el.addEventListener('pointerdown', start);
  el.addEventListener('pointerup', cancel);
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('blur', cancel);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(e); }
  });
  el.addEventListener('keyup', cancel);
  el.addEventListener('click', (e) => e.preventDefault());   // hold fires only
}

/* Build a header hold button. kind: 'home' | 'skip' | 'gear'. */
function makeHoldBtn(kind, label, ms, action) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hold-btn';
  btn.id = kind + 'Btn';
  btn.style.setProperty('--hold-dur', (ms / 1000) + 's');
  btn.title = label + ' (hold ' + (ms / 1000) + ' second' + (ms === 1000 ? '' : 's') + ')';
  btn.setAttribute('aria-label', btn.title);

  const emoji = kind === 'home' ? '\uD83C\uDFE0' : kind === 'skip' ? '➡️' : '⚙️';
  const span = document.createElement('span');
  span.className = 'hold-emoji';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = emoji;
  const text = document.createElement('span');
  text.textContent = label;

  const track = document.createElement('span');
  track.className = 'hold-track';
  track.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('span');
  fill.className = 'hold-fill';
  track.appendChild(fill);

  btn.append(span, text, track);
  makeHoldable(btn, ms, action);
  return btn;
}

/* ---------- Problem generators ----------
   Every generator returns { op, a, b, answer, text } and never
   produces a negative answer. Ranges come from
   playCeiling(game, op, grade): min(grade range, game ceiling). */

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeProblem(op, gameId, gradeId) {
  const cap = playCeiling(gameId, op, gradeId);
  if (op === 'add') {
    const a = randInt(1, Math.max(1, cap - 1));
    const b = randInt(1, Math.max(1, cap - a));
    return { op, a, b, answer: a + b, text: a + ' + ' + b + ' = ?' };
  }
  if (op === 'sub') {
    const a = randInt(2, Math.max(2, cap));
    const b = randInt(1, a - 1);
    return { op, a, b, answer: a - b, text: a + ' \u2212 ' + b + ' = ?' };
  }
  if (op === 'mul') {
    const g = gradeInfo(gradeId);
    const hi = Math.max(2, Math.min(g.limit, Math.floor(Math.sqrt(cap))));
    const a = randInt(2, hi);
    const b = randInt(2, hi);
    return { op, a, b, answer: a * b, text: a + ' \u00D7 ' + b + ' = ?' };
  }
  /* div: exact division only — pick the product first. */
  const g = gradeInfo(gradeId);
  const hi = Math.max(2, Math.min(g.limit, Math.floor(Math.sqrt(cap))));
  const b = randInt(2, hi);
  const answer = randInt(2, hi);
  const a = b * answer;
  return { op, a, b, answer, text: a + ' \u00F7 ' + b + ' = ?' };
}

/* Wrong choices: close, plausible, never negative, never the
   answer itself. Three choices total (answer + 2). The nudge
   size scales with the answer so a 4-digit sum doesn't get
   distractors that only differ by one. */
function makeChoices(problem) {
  const right = problem.answer;
  const pool = [];
  const base = right >= 10000 ? 1000 : right >= 1000 ? 100 : right >= 100 ? 10 : 1;
  const nudges = [base, -base, 2 * base, -2 * base, base * 10, -base * 10];
  /* Multiplication: an off-by-one-factor miss (3x4 = 3 or 4) is
     the classic plausible error, so include a and b too.
     Division: confusing the divisor with the quotient is. */
  if (problem.op === 'mul') {
    nudges.push(problem.a, -problem.a, problem.b, -problem.b);
  } else if (problem.op === 'div') {
    nudges.push(problem.b, -problem.b);
  }
  for (const n of nudges) {
    const v = right + n;
    if (v >= 0 && v !== right && !pool.includes(v)) pool.push(v);
  }
  /* shuffle pool, take two */
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const wrong = pool.slice(0, 2);
  /* If the pool was too small (tiny answers), pad upward. */
  let pad = right + base;
  while (wrong.length < 2) {
    if (pad !== right && !wrong.includes(pad)) wrong.push(pad);
    pad += base;
  }
  const all = wrong.concat([right]);
  for (let i = all.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/* ---------- Shared page wiring ---------- */

/* Build the header brand + game nav + sound/home holds + (picker). */
function injectHeader(activeId) {
  const head = document.querySelector('.site-head');
  if (!head || head.dataset.ready) return;
  head.dataset.ready = '1';

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = 'index.html';
  brand.innerHTML = 'Math Playground <span class="brand-sub">\u00B7 Toolshed</span>';
  head.appendChild(brand);

  const nav = document.createElement('nav');
  nav.className = 'site-nav';
  nav.setAttribute('aria-label', 'Games');
  const games = [
    ['counters.html', 'Counters'],
    ['number-line.html', 'Number Line'],
    ['facts.html', 'Facts'],
    ['story.html', 'Story Problems']
  ];
  for (const [href, name] of games) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = name;
    if (href === activeId) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  }
  head.appendChild(nav);

  const tools = document.createElement('div');
  tools.className = 'head-tools';

  if (activeId !== 'index.html') {
    /* Sound on/off — a plain tap (it only changes a preference). */
    const snd = document.createElement('button');
    snd.type = 'button';
    snd.className = 'theme-btn';
    snd.id = 'soundBtn';
    snd.addEventListener('click', () => {
      patchPlay({ sound: !soundOn() });
      syncSoundBtn();
      if (soundOn()) chime('correct');   // confirm you turned it on
    });
    tools.appendChild(snd);

    tools.appendChild(makeHoldBtn('home', 'Home', 1000, () => { location.href = 'index.html'; }));
  }
  head.appendChild(tools);
  syncSoundBtn();   // only once the button is in the document
}

function syncSoundBtn() {
  const b = document.getElementById('soundBtn');
  if (!b) return;
  const on = soundOn();
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.title = (on ? 'Turn sound off' : 'Turn sound on');
  b.setAttribute('aria-label', b.title);
  b.innerHTML = '<span aria-hidden="true">' + (on ? '\uD83D\uDD0A' : '\uD83D\uDD07') +
    '</span><span>' + (on ? 'Sound on' : 'Sound off') + '</span>';
}

/* Footer phrase — same wording as the site's ten pages. */
function injectFooter() {
  const foot = document.querySelector('.site-foot');
  if (!foot || foot.dataset.ready) return;
  foot.dataset.ready = '1';
  foot.innerHTML =
    '<a href="index.html">Home</a> \u00B7 Staff resources for The Learning Toolshed \u00B7 ' +
    '<a href="https://swankymcgee.github.io/">The Learning Toolshed</a> \u00B7 App state: November 2026';
}

/* The setup bar: grade chips + operation chips + a note.
   present on every page (home and games) so selections follow
   the student everywhere. Returns a refresh function. */
function renderSetup(opts) {
  opts = opts || {};
  const gradeRow = document.getElementById('gradeRow');
  const opRow = document.getElementById('opRow');
  const note = document.getElementById('setupNote');
  if (!gradeRow || !opRow) return function () {};

  function refresh() {
    const play = readPlay();
    const grade = gradeInfo(play.grade);

    gradeRow.textContent = '';
    for (const g of GRADES) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = g.name;
      chip.setAttribute('aria-pressed', g.id === play.grade ? 'true' : 'false');
      chip.addEventListener('click', () => {
        patchPlay({ grade: g.id });
        refresh();
        if (opts.onChange) opts.onChange();
      });
      gradeRow.appendChild(chip);
    }

    opRow.textContent = '';
    const only = opts.only || null;   // operations this game can play
    for (const o of OPS) {
      const gradeOk = grade.ops.includes(o.id);
      const allowed = gradeOk && (!only || only.includes(o.id));
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = o.symbol + ' ' + o.name;
      chip.disabled = !allowed;
      chip.setAttribute('aria-pressed',
        allowed && play.ops.includes(o.id) ? 'true' : 'false');
      chip.setAttribute('aria-label', allowed
        ? o.name + ' \u2014 ' + (play.ops.includes(o.id) ? 'on' : 'off')
        : o.name + ' \u2014 ' + (gradeOk ? 'not in this game' : 'not for Grade ' + grade.name));
      chip.addEventListener('click', () => {
        const cur = readPlay();
        /* On a game page, keep only operations that page plays. */
        let ops = cur.ops.filter((x) =>
          grade.ops.includes(x) && (!only || only.includes(x)));
        if (ops.includes(o.id)) {
          ops = ops.filter((x) => x !== o.id);
          if (!ops.length) ops = [o.id];   /* never empty */
        } else {
          ops.push(o.id);
        }
        patchPlay({ ops });
        refresh();
        if (opts.onChange) opts.onChange();
      });
      opRow.appendChild(chip);
    }

    if (note) {
      if (opts.note) {
        note.textContent = typeof opts.note === 'function'
          ? opts.note(grade, play) : opts.note;
      } else if (grade.id === 'k' || grade.id === '1' || grade.id === '2') {
        note.textContent = 'Grades K\u20132 practice adding and subtracting. ' +
          'Multiplying and dividing start in Grade 3.';
      } else {
        const names = play.ops.map((id) => opInfo(id).name.toLowerCase());
        note.textContent = 'Practicing: ' + names.join(', ') +
          ' with numbers up to ' + formatNum(playCeiling('facts', play.ops[0], play.grade)) + '.';
      }
    }
  }

  refresh();
  return refresh;
}

/* The note a game page shows under its setup bar: what this game
   plays at this grade, and the numbers it will use. */
function gameNote(gameId) {
  return function (grade, play) {
    const only = GAME_OPS[gameId] || OPS.map((o) => o.id);
    let ids = play.ops.filter((o) => only.includes(o) && grade.ops.includes(o));
    if (!ids.length) ids = [only[0]];
    const names = ids.map((o) => opInfo(o).name.toLowerCase()).join(', ');
    const cap = playCeiling(gameId, ids[0], grade.id);
    return 'This game plays ' + names + ' with numbers up to ' +
      formatNum(cap) + ' for Grade ' + grade.name + '.';
  };
}

/* Friendly number formatting for notes (100000 -> 100,000). */
function formatNum(n) {
  if (!isFinite(n)) return 'any size';
  return n.toLocaleString('en-US');
}

/* Round progress dots: `done` filled, `current` outlined. */
function renderProgress(el, done, total) {
  el.textContent = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('span');
    dot.className = 'pdot' + (i < done ? ' done' : i === done ? ' now' : '');
    el.appendChild(dot);
  }
}

/* ---------- Shared game runner ----------
   One round = five problems, then a gentle "Nice work" pause.
   Wrong answers are silent: neutral text, the choices stay put,
   and after two tries the answer is shown kindly (never a fail
   screen, never a buzzer). The student presses Next when ready —
   player-paced, no timer. Score counts successes only: a skip or a
   reveal never adds to it, and the round ends on a congrats screen.

   cfg = {
     id: 'facts', page: 'facts.html', ops: ['add', 'sub'],
     prompt(p)            -> instruction line above the problem
     render(p, box, api)  -> draw the visual (optional)
     hintFor(p)           -> hint text (optional)
     choiceMode           -> runner builds three big choices
     equation             -> 'before' (default) | 'after'
     onCorrect(p) / onWrong(p) / onReveal(p) -> page hooks
   }
   Returns api: { correct, wrong, hint, skip, refresh, problem }. */

function initGame(cfg) {
  patchPlay({ last: cfg.page });   // jump-back remembers the game

  const els = {
    prompt:  document.getElementById('prompt'),
    visual:  document.getElementById('visual'),
    problem: document.getElementById('problem'),
    choices: document.getElementById('choices'),
    feedback: document.getElementById('feedback'),
    actions: document.getElementById('actions'),
    progress: document.getElementById('progress'),
    label:   document.getElementById('progressLabel'),
    hint:    document.getElementById('hint')
  };

  const TOTAL = 5;
  const st = { idx: 0, p: null, wrong: 0, solved: false, locked: false, earned: 0 };

  /* Score pill, top of the stage. Successes only (see bumpScore). */
  const pill = document.createElement('p');
  pill.className = 'score-pill';
  function syncScore() { pill.textContent = '\u2B50 Score: ' + readPlay().score; }
  syncScore();
  if (els.progress && els.progress.parentElement) {
    const stage = els.progress.parentElement;
    stage.insertBefore(pill, stage.firstElementChild);
  }

  function eqQuestion() {
    return st.p.a + ' <span class="op">' + opInfo(st.p.op).symbol +
      '</span> ' + st.p.b + ' = ?';
  }
  function eqAnswer() {
    return st.p.a + ' <span class="op">' + opInfo(st.p.op).symbol +
      '</span> ' + st.p.b + ' = ' + st.p.answer;
  }

  function mkBtn(text, kind, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn' + (kind ? ' ' + kind : '');
    b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  }

  function setActions(list) {
    els.actions.textContent = '';
    for (const b of list) els.actions.appendChild(b);
  }

  /* Before an answer: Hint + a hold-to-skip (never a give-up tap). */
  function idleActions() {
    const list = [];
    if (cfg.hintFor) list.push(mkBtn('Hint', '', showHint));
    list.push(makeHoldBtn('skip', 'Skip', 1000, skip));
    setActions(list);
  }

  function solvedActions() {
    setActions([mkBtn('Next \u2192', 'primary', advance)]);
  }

  function showHint() {
    if (st.solved || !cfg.hintFor) return;
    els.hint.hidden = false;
    els.hint.textContent = cfg.hintFor(st.p);
    chime('reveal');
  }

  function paintChoices(chosen) {
    setLock(false);
    for (const c of els.choices.children) {
      c.setAttribute('aria-disabled', 'true');
      if (Number(c.textContent) === st.p.answer) c.classList.add('correct');
      else if (c !== chosen) c.classList.add('soft');
    }
  }

  function solve(chosen) {
    if (st.solved) return;
    st.solved = true;
    st.earned += 1;
    bumpScore();
    syncScore();
    if (cfg.choiceMode) paintChoices(chosen);
    els.feedback.className = 'feedback';
    els.feedback.textContent = 'Yes \u2014 ' + st.p.answer + '.';
    if (cfg.equation === 'after') {
      els.problem.hidden = false;
      els.problem.innerHTML = eqAnswer();
    }
    chime('correct');
    if (cfg.onCorrect) cfg.onCorrect(st.p);
    solvedActions();
  }

  function miss() {
    if (st.solved) return;
    st.wrong += 1;
    if (cfg.onWrong) cfg.onWrong(st.p);
    if (st.wrong >= 2) { reveal(); return; }   // no frustration loops
    els.feedback.className = 'feedback neutral';
    els.feedback.textContent = 'Almost \u2014 try a different one.';
  }

  function reveal() {
    if (st.solved) return;
    st.solved = true;
    if (cfg.choiceMode) paintChoices(null);
    els.feedback.className = 'feedback neutral';
    els.feedback.textContent = 'Here it is: ' + st.p.answer + '.';
    if (cfg.equation === 'after') {
      els.problem.hidden = false;
      els.problem.innerHTML = eqAnswer();
    }
    chime('reveal');
    if (cfg.onReveal) cfg.onReveal(st.p);
    else if (cfg.onCorrect) cfg.onCorrect(st.p);
    solvedActions();
  }

  /* Skip = a fresh problem at the same spot, gently worded. */
  function skip() {
    if (st.solved) return;
    load('No problem \u2014 here is a new one.');
  }

  function advance() {
    st.idx += 1;
    if (st.idx >= TOTAL) { finish(); return; }
    load();
  }

  function finish() {
    st.solved = true;
    renderProgress(els.progress, TOTAL, TOTAL);
    els.label.textContent = 'Round complete';
    els.prompt.textContent = '';
    els.problem.hidden = true;
    els.problem.textContent = '';
    els.choices.textContent = '';
    els.hint.hidden = true;
    els.hint.textContent = '';
    els.feedback.className = 'feedback';
    els.feedback.textContent = '';

    /* Congratulatory screen: round result + saved score + "again?" */
    const earned = st.earned;
    const total = readPlay().score;
    els.visual.textContent = '';
    const panel = document.createElement('div');
    panel.className = 'round-done';
    panel.innerHTML =
      '<div class="rd-emoji" aria-hidden="true">\uD83C\uDF89</div>' +
      '<h2 class="rd-title">Nice work!</h2>' +
      '<p class="rd-line">You got <strong>' + earned + ' of ' + TOTAL +
      '</strong> right this round.</p>' +
      '<p class="rd-total">Total score: <strong>' + total + '</strong></p>' +
      '<p class="rd-ask">Play again?</p>';
    els.visual.appendChild(panel);
    chime('done');
    setActions([
      mkBtn('Yes \u2014 play again', 'primary', () => { st.idx = 0; load(); }),
      mkBtn('Change practice', '', () => {
        const bar = document.getElementById('setupBar');
        if (bar) bar.scrollIntoView({ block: 'center' });
      })
    ]);
  }

  function buildChoices() {
    for (const v of makeChoices(st.p)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice' + (st.locked ? ' is-locked' : '');
      b.textContent = String(v);
      if (st.locked) b.setAttribute('aria-disabled', 'true');
      b.addEventListener('click', () => {
        if (st.solved) return;
        if (st.locked) {
          /* Not there yet — say what to do, never "wrong". */
          els.feedback.className = 'feedback neutral';
          els.feedback.textContent = cfg.lockedText
            ? cfg.lockedText(st.p) : 'Get to the landing first.';
          return;
        }
        if (v === st.p.answer) solve(b);
        else { b.classList.add('tried'); miss(); }
      });
      els.choices.appendChild(b);
    }
  }

  /* Gate the choices (the number line uses this before the hopper
     reaches the landing); prompt text is the page's to write. */
  function setLock(locked) {
    st.locked = !!locked;
    for (const c of els.choices.children) {
      c.classList.toggle('is-locked', st.locked);
      c.setAttribute('aria-disabled', st.locked ? 'true' : 'false');
    }
  }
  function setPrompt(text) { els.prompt.textContent = text; }

  function load(note) {
    if (st.idx >= TOTAL) st.idx = 0;   // finished round -> a fresh one
    st.wrong = 0;
    st.solved = false;
    st.locked = false;
    if (st.idx === 0) st.earned = 0;   // a fresh round
    const play = readPlay();
    let pool = cfg.ops.filter((o) => play.ops.includes(o));
    if (!pool.length) pool = [cfg.ops[0]];
    const op = pool[randInt(0, pool.length - 1)];
    st.p = makeProblem(op, cfg.id, play.grade);

    els.problem.hidden = cfg.equation === 'after';
    els.problem.innerHTML = eqQuestion();
    els.choices.textContent = '';
    els.prompt.textContent = cfg.prompt ? cfg.prompt(st.p) : '';
    els.feedback.className = 'feedback' + (note ? ' neutral' : '');
    els.feedback.textContent = note || '';
    els.hint.hidden = true;
    els.hint.textContent = '';
    els.visual.textContent = '';
    if (cfg.render) cfg.render(st.p, els.visual, api);
    if (cfg.choiceMode) buildChoices();
    idleActions();
    renderProgress(els.progress, st.idx, TOTAL);
    els.label.textContent = 'Problem ' + (st.idx + 1) + ' of ' + TOTAL;
  }

  const api = {
    correct: solve,
    wrong: miss,
    reveal: reveal,
    hint: showHint,
    skip: skip,
    refresh: load,
    index: () => st.idx,
    setLock: setLock,
    setPrompt: setPrompt,
    syncScore: syncScore,
    get problem() { return st.p; }
  };

  load();
  return api;
}

/* Apply theme before first paint; wire header/footer/picker once
   the DOM exists. */
applyTheme(readTheme());
if (!motifsOn()) document.documentElement.classList.add('motifs-off');

function initChrome() {
  const active = (location.pathname.split('/').pop() || 'index.html');
  injectHeader(active);
  injectPicker();
  injectFooter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChrome);
} else {
  initChrome();
}

/* Our Day's reminder notices: one small same-origin script, loaded only
   when this page is served from the Toolshed hub. Opened from disk the
   tool stays fully offline — no network request is ever made. */
(function loadOurDayNotify() {
  try {
    if (location.protocol === 'file:') return;
    if (location.hostname !== 'swankymcgee.github.io') return;
    if (document.querySelector('script[data-ourday-notify]')) return;
    const s = document.createElement('script');
    s.src = 'https://swankymcgee.github.io/our-day/ourday-notify.js';
    s.dataset.ourdayNotify = '1';
    s.defer = true;
    document.head.appendChild(s);
  } catch (err) { /* never break this tool */ }
})();

/* Another tab changed the shared palette or patterns — follow it. */
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    applyTheme(readTheme());
    syncMotifs();
  }
});
