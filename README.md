# MOS Arcade — standalone

The games, the apps, and the page that lists them, in one folder.

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
    games/              The games, one folder each.
    shots/              One screenshot per game, named by slug.

    apps.json           The app list. Generated the same way.
    apps/               The apps, one folder each.
    app-shots/          One screenshot per app, named by slug.

    tools/              The catalog generator and the two category maps.

About 6 MB all in.

---

## Two sections, one page

The page has a **Games** tab and an **Apps** tab. Same search box, same
sort pills, same category chips, same cards — the tab just changes which
list is underneath them.

Two things are games-only, and on purpose: **Today's pick** and
**Surprise me**. Both are lotteries, and a lottery is a good way to meet
a game you didn't know you wanted. Nobody wants to be handed a random
invoice tool. They disappear in the Apps tab rather than going quiet.

The tab row only appears when **both** sections have something in them.
With no apps, this is exactly the page it was before — no tabs, no
stray empty section.

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

## Adding a game, or an app

Same three steps either way — `games/` for a game, `apps/` for an app.

1. Put the folder inside `games/` or `apps/`.

2. Name it in lowercase, with dashes, no spaces:

       games/tile-town/          tidiest
       apps/shift-planner/       tidiest
       apps/Shift Planner/       works too — listed as shift-planner

   The folder name becomes the **slug**, which is also what the
   screenshot has to be called. A folder that isn't already in slug
   form still gets listed; the build prints the slug it derived, since
   that's the one thing you can't guess from the outside.

3. Drop a screenshot at `shots/<slug>.jpg` for a game, or
   `app-shots/<slug>.jpg` for an app.
   No screenshot is fine — the card falls back to a coloured emoji.

Then, from this folder:

    node tools/build-catalog.mjs

That rewrites **both** `games.json` and `apps.json`. Needs Node 18 or
newer, nothing else.

**Removing** either is the same in reverse: move the folder out, re-run
the command.

### What can't be listed

Every entry is opened in a browser, so every entry needs a web page in
it. A folder with no `.html` file inside is skipped and named in the
build output.

That's the honest answer for a native project — an Android or iOS app
dropped into `apps/` has nothing a browser can open, and the build says
so rather than listing a build log by mistake. Build output folders
(`build/`, `dist/`, `out/`, `target/`, `node_modules/`, …) are never
looked inside for exactly that reason.

---

## The generator won't eat your edits

`build-catalog.mjs` **merges**. Anything already in `games.json` or
`apps.json` keeps its `name` and its `description` — the two fields
you'd write by hand. Only the URL, category and date get refreshed.

So you can open either file, write a proper description, re-run the
generator, and your description is still there.

New entries get a name read out of the page's `<title>`. Usually right,
always editable — and worth checking, since the title is the app's name
and the folder might not be. `apps/C++ Helper/loop-quest.html` is
listed as **Loop Quest**, because that's what its page calls itself.

---

## Categories

The chips above the grid. Each section has its own set.

**Games** — Puzzle, Action, Word, Chill, Arcade, Kids — come from
`tools/arcade-categories.mjs`, which is a copy of MOS's own
`arcade-categories.js`. To move a game to a different chip, edit that
file and re-run the generator.

It's a copy, not a link. If you change categories in MOS and want the
same here, copy the file across. That's the one seam between the two,
and it's deliberate — a copy you update on purpose beats a live
dependency you forgot about.

**Apps** — Productivity, Tools, Money, Learning, Health, Fun — come from
`tools/app-categories.mjs`, which answers to nobody but this folder.
Rename them, cut them, add to them.

An app can be filed two ways, and its own page wins:

1. A tag in the app's HTML, which travels with the app:

       <meta name="category" content="Money">

2. The `BY_SLUG` map in `tools/app-categories.mjs`:

       const BY_SLUG = {
         'shift-planner': 'Productivity',
       };

Anything filed neither way lands in **Uncategorized**, same as a game.
Until at least two categories are in play the chip row doesn't appear
at all — one chip is a control that can only say the same thing twice —
so a set of unfiled apps is a clean grid, not a mess.

Adding a category to either file is a one-line change. Add it to the
matching `catOrder` in `arcade.js` too, or it still gets a chip, just
filed after the ones the page knows about.

---

## What changed from the MOS version

Three things.

**The game list.** The page used to fetch `/api/public/arcade` from the
MOS server. Now it reads `games.json` sitting next to it.

**The slug rule.** `slugOf()` used to require a leading slash, because
MOS served games from `/games/<slug>` at a domain root. This build's
links are relative, so it now accepts both. Without that change every
card silently loses its screenshot, and Today's Pick and Surprise Me
come up empty.

**The Apps section.** New here — MOS had no such thing. It's the tab row
described above, and the rest of the page is shared with the games
rather than copied, so the two can't drift apart.

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
