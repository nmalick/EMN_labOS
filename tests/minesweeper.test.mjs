/**
 * Rule tests for the Minesweeper engine in docs/minesweeper.html.
 *
 * The page is deliberately a single self-contained file (no build step), so this
 * harness extracts the engine section — everything between the state constants and
 * the view — and imports it as a module. The view is not exercised here.
 *
 * Run: node tests/minesweeper.test.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(ROOT, "docs", "minesweeper.html");

function loadEngine() {
  const src = readFileSync(PAGE, "utf8");
  const start = src.indexOf("const HIDDEN = 0");
  const end = src.indexOf("/* ---- view ---");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("engine markers not found in docs/minesweeper.html — did the file get restructured?");
  }
  const dir = mkdtempSync(join(tmpdir(), "minesweeper-"));
  const file = join(dir, "engine.mjs");
  writeFileSync(file, src.slice(start, end) + "\nexport { Game, HIDDEN, OPEN, FLAG, MARK, LEVELS };\n");
  return import(pathToFileURL(file).href);
}

const { Game, HIDDEN, OPEN, FLAG, MARK, LEVELS } = await loadEngine();

let passed = 0;
const failures = [];
const ok = (cond, msg) => (cond ? passed++ : failures.push(msg));

/** A board with hand-placed mines, so the rules can be tested deterministically. */
function fixed(cols, rows, mines) {
  const g = new Game(cols, rows, mines.length);
  for (const i of mines) g.mine[i] = 1;
  for (let i = 0; i < g.size; i++) {
    if (g.mine[i]) continue;
    let n = 0;
    for (const j of g.neighbours(i)) n += g.mine[j];
    g.adj[i] = n;
  }
  g.placed = true;
  return g;
}

/* -- geometry ---------------------------------------------------------------*/
{
  const g = fixed(3, 3, [4]);
  ok(g.neighbours(0).length === 3, "a corner has 3 neighbours");
  ok(g.neighbours(1).length === 5, "an edge has 5 neighbours");
  ok(g.neighbours(4).length === 8, "the centre has 8 neighbours");
  ok([0, 1, 2, 3, 5, 6, 7, 8].every((i) => g.adj[i] === 1), "every cell around one mine reads 1");
  ok(g.idx(2, 1) === 5 && String(g.xy(5)) === "2,1", "idx/xy round-trip");
}

/* -- first-click safety -----------------------------------------------------*/
for (let t = 0; t < 200; t++) {
  const g = new Game(9, 9, 10);
  g.reveal(40);
  ok(g.mine[40] === 0, "the first click is never a mine");
  ok(g.neighbours(40).every((n) => g.mine[n] === 0), "the first click's neighbourhood is cleared too");
  ok(!g.over, "the first click never ends the game");
}
for (let t = 0; t < 100; t++) {
  // 8 mines on 9 cells: no room for the 3x3 safe zone, but the clicked cell is still safe
  const g = new Game(3, 3, 8);
  g.reveal(4);
  ok(g.mine[4] === 0, "packed board: the clicked cell is still safe");
  ok(g.won, "packed board: revealing the only safe cell wins");
}
for (let t = 0; t < 100; t++) {
  const g = new Game(16, 16, 40);
  g.reveal(0);
  let count = 0;
  for (let i = 0; i < g.size; i++) count += g.mine[i];
  ok(count === 40, "exactly the requested number of mines is placed");
}

/* -- revealing and flood fill ----------------------------------------------*/
{
  const g = fixed(5, 5, [24]);
  g.reveal(0);
  ok(g.opened === 24, "the flood opens every cell except the mine");
  ok(g.state[18] === OPEN && g.adj[18] === 1, "numbers are opened but not passed through");
  ok(g.won, "clearing every safe cell wins");
}
{
  const g = fixed(5, 5, [24]);
  g.cycleFlag(12, false);
  g.reveal(0);
  ok(g.state[12] === FLAG, "a flag survives a flood");
  ok(g.opened < 24, "the flood does not open flagged cells");
}
{
  const g = fixed(5, 5, [24]);
  g.reveal(0);
  const before = g.opened;
  g.reveal(1);
  ok(g.opened === before, "re-revealing an open cell changes nothing");
}

/* -- flags and the mine counter --------------------------------------------*/
{
  const g = fixed(5, 5, [0, 1, 2]);
  ok(g.remaining() === 3, "remaining starts at the mine count");
  g.cycleFlag(10, true);
  ok(g.state[10] === FLAG && g.remaining() === 2, "flagging decrements remaining");
  g.cycleFlag(10, true);
  ok(g.state[10] === MARK && g.remaining() === 3, "flag -> ? restores the count");
  g.cycleFlag(10, true);
  ok(g.state[10] === HIDDEN, "? -> hidden closes the cycle");
  g.cycleFlag(10, false);
  g.cycleFlag(10, false);
  ok(g.state[10] === HIDDEN, "with ? marks off, a flag clears straight to hidden");
  for (const i of [11, 12, 13, 14]) g.cycleFlag(i, false);
  ok(g.remaining() === -1, "over-flagging drives the counter negative");
  g.reveal(12);
  ok(g.state[12] === FLAG, "a flagged cell cannot be revealed by accident");
}
{
  const g = fixed(5, 5, [24]);
  g.cycleFlag(12, true);
  g.cycleFlag(12, true);
  g.reveal(12);
  ok(g.state[12] === OPEN, "a ?-marked cell still reveals normally");
}

/* -- chording ---------------------------------------------------------------*/
{
  const g = fixed(4, 4, [0]);
  g.reveal(5);
  ok(g.chord(5).length === 0, "a chord does nothing until the count is satisfied");
  g.cycleFlag(0, false);
  g.chord(5);
  ok(g.state[1] === OPEN && g.state[4] === OPEN, "a satisfied chord opens the unflagged neighbours");
  ok(!g.over || g.won, "a correct chord never detonates");
}
{
  const g = fixed(4, 4, [0, 5]);
  g.reveal(10);
  g.cycleFlag(15, false); // wrong flag: 10 reads 1 but the flagged neighbour is safe
  g.chord(10);
  ok(g.over && !g.won, "a chord under a mis-placed flag detonates");
  ok(g.mine[g.boom] === 1, "boom points at an actual mine");
}
{
  const g = fixed(4, 4, [0]);
  ok(g.chord(15).length === 0, "a chord on a hidden cell is a no-op");
  g.reveal(15);
  ok(g.adj[15] === 0 && g.chord(15).length === 0, "a chord on a 0 is a no-op");
}
{
  const g = fixed(5, 5, [0]);
  g.reveal(6);
  g.cycleFlag(0, true);
  g.cycleFlag(1, true);
  g.cycleFlag(1, true); // leave a ? on a safe neighbour
  g.chord(6);
  ok(g.state[1] === OPEN, "a ? never blocks a chord");
}

/* -- end states -------------------------------------------------------------*/
{
  const g = fixed(4, 4, [0, 3, 12]);
  g.cycleFlag(0, false);
  g.reveal(3);
  ok(g.over && !g.won, "stepping on a mine loses");
  ok(g.boom === 3, "boom records the detonated cell");
  ok(g.state[0] === FLAG, "a correct flag stays a flag after a loss");
  ok(g.state[12] === OPEN, "unflagged mines are exposed on a loss");
  ok(g.reveal(5).length === 0 && g.cycleFlag(5, false).length === 0 && g.chord(5).length === 0,
     "the board is frozen after a loss");
}
{
  const g = fixed(3, 3, [0]);
  g.reveal(8);
  ok(g.won && g.over, "opening every safe cell wins");
  ok(g.state[0] === FLAG && g.remaining() === 0, "a win auto-flags the last mine and zeroes the counter");
  ok(g.reveal(1).length === 0, "the board is frozen after a win");
}

/* -- end to end: logic-only play must never detonate a mine -----------------*/
for (const [name, cfg] of Object.entries(LEVELS)) {
  for (let t = 0; t < 25; t++) {
    const g = new Game(cfg.cols, cfg.rows, cfg.mines);
    g.reveal(((cfg.rows / 2) | 0) * cfg.cols + ((cfg.cols / 2) | 0));
    let progress = true;
    while (progress && !g.over) {
      progress = false;
      for (let i = 0; i < g.size; i++) {
        if (g.state[i] !== OPEN || !g.adj[i]) continue;
        const ns = g.neighbours(i);
        const unresolved = ns.filter((n) => g.state[n] !== OPEN && g.state[n] !== FLAG);
        const flags = ns.filter((n) => g.state[n] === FLAG).length;
        if (!unresolved.length) continue;
        if (unresolved.length + flags === g.adj[i]) {
          for (const n of unresolved) g.cycleFlag(n, false);
          progress = true;
        } else if (flags === g.adj[i]) {
          g.chord(i);
          progress = true;
        }
      }
    }
    ok(!g.over || g.won, `${name}: deduction-only play never detonates a mine`);
  }
}

/* -- report -----------------------------------------------------------------*/
const unique = [...new Set(failures)];
for (const f of unique) console.log(`  x ${f}`);
console.log(`minesweeper: ${passed} assertions passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
