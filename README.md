# MOS Arcade — standalone

84 games and the page that lists them, in one folder.

No MOS. No server. No API, no database, no login, no session cookie.
Nothing in here talks to the MOS platform, and nothing on the MOS
platform is needed for it to run.

Open `index.html` and it works.

---

## What's in here

    index.html          The Arcade page.
    arcade.js           What the page does — search, sort, filters, picks.
    theme-boot.js       Sets light/dark before the first paint.
    games.json          The game list. Generated — see below.
    shots/              One screenshot per game, named by slug.
    games/              The 84 games, one folder each.
    tools/              The catalog generator and the category map.

About 6 MB all in.

---

## Putting it online

Upload the folder. That's the whole deployment.

- **Netlify / Cloudflare Pages** — drag the folder onto the dashboard.
- **GitHub Pages** — new repo, push the folder, Settings → Pages.
- **Normal hosting** — FTP it into the web root.

It works at a domain root (`arcade.example.com/`) **and** in a
subfolder (`example.com/arcade/`). Every link inside is relative, so
neither one breaks the other.

---

## Adding a game

Three steps, then one command.

1. Put the game's folder inside `games/`.

2. Name that folder in lowercase, with dashes, no spaces:

       games/tile-town/          yes
       games/Tile Town/          no

   The folder name is the game's slug. It's also what the screenshot
   has to be called.

3. Drop a screenshot at `shots/<slug>.jpg`.
   No screenshot is fine — the card falls back to a coloured emoji.

Then, from this folder:

    node tools/build-catalog.mjs

That rewrites `games.json`. Needs Node 18 or newer, nothing else.

**Removing a game** is the same in reverse: move the folder out of
`games/`, re-run the command.

---

## The generator won't eat your edits

`build-catalog.mjs` **merges**. A game already in `games.json` keeps its
`name` and its `description` — the two fields you'd write by hand. Only
the URL, category and date get refreshed.

So you can open `games.json`, write a proper description for a game,
re-run the generator, and your description is still there.

New games get a name read out of the page's `<title>`. Usually right,
always editable.

---

## Categories

The chips across the top — Puzzle, Action, Word, Chill, Arcade, Kids —
come from `tools/arcade-categories.mjs`, which is a copy of MOS's own
`arcade-categories.js`.

To move a game to a different chip, edit that file and re-run the
generator.

It's a copy, not a link. If you change categories in MOS and want the
same here, copy the file across. That's the one seam between the two,
and it's deliberate — a copy you update on purpose beats a live
dependency you forgot about.

---

## What changed from the MOS version

Two things, and only two.

**The game list.** The page used to fetch `/api/public/arcade` from the
MOS server. Now it reads `games.json` sitting next to it.

**The slug rule.** `slugOf()` used to require a leading slash, because
MOS served games from `/games/<slug>` at a domain root. This build's
links are relative, so it now accepts both. Without that change every
card silently loses its screenshot, and Today's Pick and Surprise Me
come up empty.

Everything else — the layout, the theme toggle, the search, the sort
pills, Today's Pick, Surprise Me — is the page you already had.

---

## What this fixes

The games were already safe. `hosted.js` moved them onto their own
origin a while back, away from the API and the session cookie.

The Arcade *page* wasn't. It was still served from the MOS origin —
a public, no-account page sitting on the same origin as your API and
your staff session. Your own comment in `arcade.js` said as much:
"the API and the session cookie live here."

Now it isn't there at all. Different folder, different deployment,
different domain. Nothing to share.

---

## One thing to keep true

Host this on its own domain or subdomain — not in a folder under the
one MOS uses.

    arcade.example.com          yes
    example.com/arcade/         yes, if MOS isn't on example.com

    mos.example.com/arcade/     no, if MOS is at mos.example.com

Browsers separate things by origin, not by folder. Same domain means
shared cookies and shared storage, which is the thing this split exists
to undo.
