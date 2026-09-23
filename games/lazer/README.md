# Prism Path

A cozy laser puzzle game. Bend the beam with mirrors and splitters until every
target is lit.

## Run it

**Double-click `index.html`.** That's it.

One file, no build step, no server, no install, no dependencies. Works offline.
Everything saves to `localStorage` in your browser.

## Nothing is locked

All 4 difficulties and all 24 levels in each (96 total) are open from the very
first launch. Play them in any order, replay any level, skip straight to Expert
level 21 if you want. Replaying a level keeps your *best* move count and never
double-counts toward your stats.

- **Play** → pick a difficulty → pick any level
- **Daily Challenge** → same puzzle for everyone, changes at UTC midnight
- **Profile** → name, recent achievement, all achievements, progress
- **Settings** → 13 themes, music/SFX toggles, reset progress

Speaker icon (top right) mutes everything.

## What's verified

Unlike the Flutter version, I could actually **run** this one. The test suite
executes the real shipped code out of `index.html`:

- All 96 levels (4 difficulties × 24) confirmed solvable by brute force
- No level is ever generated already-solved
- Every level reachable on a fresh save — no gating anywhere
- Replay doesn't inflate stats; best score keeps the minimum
- Out-of-order completion counted correctly
- Daily puzzle deterministic within a day, different the next
- Splitter regression test (see below)

## The bug worth knowing about

The splitter originally didn't split. It marked the pass-through beam as
"visited" before that beam was ever processed, so it got discarded as a
duplicate and the splitter silently behaved like a plain mirror.

A target **absorbs** the beam, so two targets can't share one branch — the first
eats the light. Multi-target puzzles therefore *need* working splitters. With the
bug, medium/hard/expert and every Daily Challenge were impossible to generate.

There's a permanent regression test for it. Don't delete it.

## Themes

**Saisons** (these also swap the sounds and the background):
Été (beach + water), Printemps (flowers + birds), Automne (leaves + lofi),
Hiver (snow + bells)

**Mood:** Nature, Calme & Bien-être, Créativité, Énergie, Minimaliste,
Romantique, Océan (fish), Néon / Nuit Urbaine, Fancy (coffee cups)

## Audio

All sound is **synthesized live with WebAudio** — there are no `.mp3` files to
find or license. Each season has its own SFX flavour (sun chime, sparkle, leaf
crunch, snow crunch) and its own ambient loop.

Browsers block audio until you first click, so sound starts on your first tap.

## How the generator works

The generator walks the beam out from the source and places each piece *directly
on the beam*, so every piece is guaranteed to be hit. It splits when it's short
on branches and caps each branch with a target. The board is solved **by
construction**, then the rotations get scrambled — which is why a generated level
can never be unsolvable.
