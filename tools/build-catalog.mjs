// Rebuilds games.json from games/, and apps.json from apps/.
//
//   node tools/build-catalog.mjs
//
// Run it from the folder above this one (the one with index.html in it),
// after adding or removing a game or an app. Needs Node 18+ and nothing else
// — no npm install, no dependencies, no database, no MOS.
//
// One command for both lists on purpose. They are the same job twice — walk a
// folder, find each entry's page, look its category up, merge with what is
// already written — and two scripts doing the same job drift: the day one of
// them learns something the other does not, the two halves of the page start
// behaving differently for no reason a reader could find. So the job lives
// once, in buildCollection(), and is called twice with what differs.
//
// What it does, and what it deliberately does NOT do
// --------------------------------------------------
// Each directory under games/ is one game and each directory under apps/ is
// one app. The folder name becomes its slug — lowercased, accents folded,
// anything else turned into a dash — and the slug is what its screenshot is
// filed under (shots/ for games, app-shots/ for apps). The script finds the
// page to open (index.html if there is one, otherwise the shallowest .html),
// looks the category up, and writes a row.
//
// The folder is not required to already BE a slug. "C++ Helper" is listed, at
// apps/C%2B%2B%20Helper/…, under the slug c-helper; the build prints the slug
// it derived whenever it differs from the folder, because that slug is the
// name the screenshot has to be filed under and there is no way to guess it
// from the outside. Naming the folder in slug form to begin with is still the
// tidier habit — it keeps the URL free of escapes — but it is a preference
// now and not a rule, because the rule's failure mode was an app that quietly
// never appeared.
//
// It MERGES rather than overwrites. An entry already in the catalog keeps its
// name and its description; only url, category and the derived fields are
// refreshed. That matters because those two fields are the ones you write by
// hand — a generator that wiped them every run would be a generator nobody
// runs twice. New folders get a name read out of the page's <title>, which is
// usually right and always editable afterwards.
//
// A folder that disappears drops out of the list. That is the intended way to
// unlist something: move the folder out, re-run this.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categoryForSlug as gameCategory } from './arcade-categories.mjs';
import { categoryForSlug as appCategory } from './app-categories.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

/* Folders the walk below refuses to look inside. Dotfolders (.gradle, .idea,
   .git) are covered separately by the startsWith('.') test; these are the
   ones that do not announce themselves with a dot.

   This list is not tidiness, it is correctness. An Android project dropped
   into apps/ has no web page in it at all, but Gradle leaves an HTML problems
   report at build/reports/problems/problems-report.html — exactly three
   levels down, exactly inside the walk's reach. Without this the arcade
   would list a build log as an app, name it off that page's <title>, and
   look for a screenshot of it. Far better that such a folder is reported as
   having no page in it, which is the truth. */
const IGNORED_DIRS = new Set(['node_modules', 'build', 'dist', 'out', 'target', 'coverage', 'vendor', 'bin', 'obj']);

// Same rule the original server used: prefer index.html, then the shallowest
// .html file. Dotfolders and build output are skipped, and the walk stops at
// three levels so an entry that ships its own vendor tree does not send this
// off hunting through it.
function findEntryFile(dir, maxDepth = 3) {
  let best = null;
  (function walk(current, prefix, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        if (IGNORED_DIRS.has(ent.name.toLowerCase()) || ent.name.startsWith('.')) continue;
        walk(path.join(current, ent.name), rel, depth + 1);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
        const isIndex = ent.name.toLowerCase() === 'index.html';
        if (!best || (isIndex && !best.isIndex) || (isIndex === best.isIndex && depth < best.depth)) {
          best = { relPath: rel, isIndex, depth };
        }
      }
    }
  })(dir, '', 0);
  return best ? best.relPath : null;
}

/* Folder name → slug. Accents folded onto their letter, lowercased, every
   run of anything else collapsed to a single dash:

     Build-Forge    → build-forge
     C++ Helper     → c-helper
     OfflinePlayer  → offlineplayer
     Café Timer     → cafe-timer

   A folder already in slug form comes back untouched, which is why all
   eighty games keep the slugs they have had. */
function slugify(name) {
  return String(name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* A relative href for a path whose segments are real folder names and may
   therefore contain spaces, plus signs, hashes — anything a person can type
   into a folder name. Each segment is escaped on its own so the slashes
   between them survive.

   Not cosmetic: 'apps/C++ Helper/x.html' as a bare href is read by a browser
   as a path containing a space, and the plus signs are ambiguous enough that
   some static hosts hand back the wrong file rather than a 404 — a failure
   that looks like a broken app instead of a broken link. */
function href(...segments) {
  return segments.join('/').split('/').map(encodeURIComponent).join('/');
}

// The first few KB of an entry's page, which is where both of the things read
// off it live — the <title> and, for apps, the category <meta>. Read once per
// entry rather than once per question.
function readHead(file) {
  try { return fs.readFileSync(file, 'utf8').slice(0, 4000); }
  catch { return ''; }
}

// Only used for an entry this script has never seen. Anything already named
// in the catalog keeps the name it has.
function nameFromHead(head, slug) {
  const m = head.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) {
    // Titles often carry a suffix — "Cubelle — MOS Arcade". Keep the first part.
    const t = m[1].split(/[—–|·]/)[0].replace(/\s+/g, ' ').trim();
    if (t) return t;
  }
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* <meta name="category" content="Money"> out of an app's own page, so an app
   can file itself instead of waiting on an entry in app-categories.mjs. Both
   attribute orders are accepted because both are written in the wild, and
   `mos-category` alongside `category` because the bare word is generic enough
   that an app might already be using it for something of its own.

   Trimmed and length-capped before it is trusted: the value becomes a chip
   label on the page, and an unbounded one would be a 2000-character button. */
function categoryFromHead(head) {
  const tags = head.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/\bname\s*=\s*["']?(?:mos-)?category["'\s>]/i.test(tag)) continue;
    const m = tag.match(/\bcontent\s*=\s*"([^"]*)"/i) || tag.match(/\bcontent\s*=\s*'([^']*)'/i);
    const v = m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 40) : '';
    if (v) return v;
  }
  return null;
}

/* One collection: read the old catalog, walk the folder, write the new one.
   Returns a report rather than printing it, so the two runs can be summarised
   together at the end.

     dirName    the folder to walk, relative to ROOT  ('games')
     outName    the catalog it writes                 ('games.json')
     shotsDir   where its screenshots live            ('shots')
     categoryOf (slug, head) => category
     required   true for games: no folder is then a fatal error rather than
                an empty list. Games are the reason this folder exists; apps
                are an addition, and a build that has not had any added to it
                yet is not a build that has gone wrong. */
function buildCollection({ dirName, outName, shotsDir, categoryOf, required }) {
  const dir = path.join(ROOT, dirName);
  const out = path.join(ROOT, outName);

  const previous = new Map();
  if (fs.existsSync(out)) {
    try {
      for (const row of JSON.parse(fs.readFileSync(out, 'utf8'))) {
        if (row && row.id) previous.set(String(row.id), row);
      }
    } catch (e) {
      console.error(`${outName} exists but could not be read (${e.message}).`);
      console.error('Move it aside and re-run to start fresh — refusing to overwrite it blind.');
      process.exit(1);
    }
  }

  if (!fs.existsSync(dir)) {
    if (required) {
      console.error(`No ${dirName}/ folder next to ${outName} — nothing to build.`);
      process.exit(1);
    }
    // Not written, not emptied. A folder missing entirely is more likely a
    // half-copied upload than a decision to unlist everything, and silently
    // replacing a good catalog with [] is the one outcome here that cannot be
    // undone by re-running this.
    return { dirName, outName, missing: true, rows: [], added: [], gone: [], noShot: [], skipped: [] };
  }

  const rows = [];
  const skipped = [];
  const renamed = [];
  const claimed = new Map();   // slug → the folder that got there first
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
    const folder = ent.name;
    const slug = slugify(folder);
    if (!slug) {
      skipped.push(`${folder} — the folder name has no letters or numbers in it to build a slug from; rename it`);
      continue;
    }
    // Two folders cannot share one slug: they would share a screenshot, and
    // the second would overwrite the first in a catalog keyed on id. First
    // one read wins, and the loser is named rather than dropped in silence.
    if (claimed.has(slug)) {
      skipped.push(`${folder} — would be listed as "${slug}", which ${claimed.get(slug)} already is; rename one of them`);
      continue;
    }
    const here = path.join(dir, folder);
    const entry = findEntryFile(here);
    if (!entry) { skipped.push(`${folder} — no .html file found inside (a folder with no web page in it cannot be opened in a browser)`); continue; }
    claimed.set(slug, folder);
    if (slug !== folder) renamed.push(`${folder} → ${slug}`);

    const head = readHead(path.join(here, entry));
    const old = previous.get(slug);
    // Dated by the page itself, not the folder: copying a folder about the
    // place resets its mtime, and the entry's own file is the thing that
    // actually changed.
    let addedAt;
    try { addedAt = fs.statSync(path.join(here, entry)).mtimeMs; }
    catch { addedAt = fs.statSync(here).mtimeMs; }
    rows.push({
      id: slug,
      name: old?.name ?? nameFromHead(head, slug),
      description: old?.description ?? '',
      // The real folder, escaped — not the slug. The slug is the identity the
      // page files a screenshot under; this has to be the path that exists.
      url: href(dirName, folder, entry),
      category: categoryOf(slug, head),
      addedAt: old?.addedAt ?? addedAt,
    });
  }

  // A–Z, accents filed under their letter and case ignored — the page does
  // not reorder what it is given, so the order is decided here.
  rows.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }));

  fs.writeFileSync(out, JSON.stringify(rows, null, 2) + '\n');

  return {
    dirName, outName, missing: false, rows, renamed,
    added: rows.filter(r => !previous.has(r.id)).map(r => r.id),
    gone: [...previous.keys()].filter(k => !rows.some(r => r.id === k)),
    noShot: rows.filter(r => !fs.existsSync(path.join(ROOT, shotsDir, r.id + '.jpg'))).map(r => r.id),
    skipped,
  };
}

function report(r, noun, shotsDir) {
  if (r.missing) {
    console.log(`${r.outName} left alone — there is no ${r.dirName}/ folder to read.`);
    return;
  }
  const n = r.rows.length;
  console.log(`${r.outName} written — ${n} ${noun}${n === 1 ? '' : 's'}.`);
  if (r.added.length) console.log(`  added:   ${r.added.join(', ')}`);
  if (r.gone.length) console.log(`  removed: ${r.gone.join(', ')}`);
  // Printed because the slug is the screenshot's filename, and a slug that
  // does not match the folder is the one thing here nobody can work out by
  // looking at the folder.
  if (r.renamed.length) { console.log(`  listed under a slug that differs from the folder name:`); r.renamed.forEach(s => console.log(`    ${s}`)); }
  if (r.noShot.length) console.log(`  no screenshot in ${shotsDir}/ (the card falls back to an emoji): ${r.noShot.join(', ')}`);
  if (r.skipped.length) { console.log('  skipped:'); r.skipped.forEach(s => console.log(`    ${s}`)); }
}

const games = buildCollection({
  dirName: 'games',
  outName: 'games.json',
  shotsDir: 'shots',
  categoryOf: slug => gameCategory(slug),
  required: true,
});

const apps = buildCollection({
  dirName: 'apps',
  outName: 'apps.json',
  shotsDir: 'app-shots',
  // The app's own page first, the hand-kept map second — see app-categories.mjs.
  categoryOf: (slug, head) => categoryFromHead(head) || appCategory(slug),
  required: false,
});

report(games, 'game', 'shots');
report(apps, 'app', 'app-shots');
