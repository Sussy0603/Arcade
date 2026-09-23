// The Arcade page's whole program: theme toggle, and the fetch of
// games.json that turns into the game cards.
//
// It lives in a file rather than inline at the end of index.html because the
// original was served under a `script-src 'self'` policy that blocks inline
// script. Nothing here depends on that any more — this folder is standalone —
// but a separate file is still the right shape: any host you drop this on can
// set the same policy, and the failure mode if one does is silent and
// expensive to read (the page returns 200, paints its header, and sits on
// "Loading…" forever). Keep it a file.
//
// STANDALONE. This build has no connection to the MOS platform: no API, no
// session cookie, no shared origin. The game list is games.json next to this
// file, written by tools/build-catalog.mjs from whatever is in games/.
(function(){
"use strict";

/* ---------------- Theme ---------------- */
const THEME_KEY = 'mosArcadeTheme';
const btn = document.getElementById('themeBtn');
const iconEl = document.getElementById('themeIcon');
const labelEl = document.getElementById('themeLabel');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function stored(){
  try{ return localStorage.getItem(THEME_KEY); }catch(e){ return null; }
}
function activeTheme(){
  return document.documentElement.getAttribute('data-theme') || (systemDark.matches ? 'dark' : 'light');
}
// The button is labelled with what it will DO, not with what's on screen —
// in daylight it offers "Dark", at night it offers "Light".
function syncButton(){
  const goingTo = activeTheme() === 'dark' ? 'light' : 'dark';
  iconEl.textContent = goingTo === 'dark' ? '🌙' : '☀️';
  labelEl.textContent = goingTo === 'dark' ? 'Dark' : 'Light';
  btn.setAttribute('aria-label', 'Switch to ' + goingTo + ' mode');
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', activeTheme() === 'dark' ? '#241C40' : '#FFF6E5');
}
btn.addEventListener('click', ()=>{
  const next = activeTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
  syncButton();
});
// Follow the OS as it changes, but only for visitors who never picked a
// side themselves — an explicit choice outranks the system setting.
systemDark.addEventListener('change', ()=>{ if(!stored()) syncButton(); });
syncButton();

/* ---------------- Listing ---------------- */
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// Deterministic per-entry colour + icon so every card looks hand-picked
// and, crucially, keeps the same look on every page load. The colour is
// applied as a class rather than an inline style so that both themes'
// versions of that tint live in CSS and the toggle needs no re-render.
const EMOJI = ['🎮','🕹️','⭐','🧩','🚀','🎲','🏆','✨'];
function hashOf(id){
  let h = 0;
  for(let i=0;i<id.length;i++) h = (h*31 + id.charCodeAt(i)) >>> 0;
  return h;
}
// The one hash that decides an entry's tint and emoji. Both the grid card
// and the Today's pick tile go through here so the same game wears the same
// colours in both places — a visitor who clicks the big tile and then looks
// for it again in the list below is looking for a colour, not a name.
function lookHash(it){
  return hashOf(String(it.id ?? it.name ?? ''));
}
// The game's slug, read back out of its own games/<slug> link. This is the
// closest thing the listing has to a stable identity — the server treats it
// as exactly that when it evicts duplicate entries — whereas `id` is a
// mos-app app id that a re-seeded Registry can replace. Anything that isn't
// a /games/ link (an outside site, a dropped app) has no slug, and that
// absence is also how this page tells a game from everything else.
function slugOf(url){
  // (?:^|\/) rather than a bare \/ : this build's links are RELATIVE
  // ('games/antics/index.html'), so the folder can sit at a domain root or in
  // a subfolder and work either way. The original links were absolute paths on
  // the hosted origin and always had the leading slash this used to require —
  // without this, every card loses its slug, which silently costs it its
  // screenshot AND drops it out of Today's pick and Surprise me.
  const m = String(url ?? '').match(/(?:^|\/)games\/([a-z0-9-]+)(?:[/?#]|$)/i);
  return m ? m[1].toLowerCase() : null;
}
// A listing entry's URL is typed by a member of staff and ends up here as a
// navigation target — an href on every card and, since Surprise me, an
// argument to window.open. slugOf() already insists on a /games/ path, but
// "contains /games/" and "is an http link" are different claims and only the
// second one is safe to open. Anything else is treated as not being a game,
// which is the quietest way to refuse it.
function playableUrl(url){
  try{
    const u = new URL(url, location.href);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null;
  }catch(e){ return null; }
}
// The Arcade can also carry an app or a website that somebody opted in by
// hand, and two things on this page mean games specifically: Today's pick,
// whose "Play ▶" is a promise a brochure site does not keep, and Surprise
// me, which would not have surprised anyone in a good way. Asked in one
// place so the two cannot drift apart.
function gamesOnly(items){
  return items.filter(it=>slugOf(it.url) && playableUrl(it.url));
}

// A card's picture is a real screenshot of the game, taken by
// mos-server's tools/capture-arcade-shots.mjs and filed under its slug.
// The listing itself carries no image field, which means a game that gets
// listed later needs nothing more than a re-run of that tool. Anything with
// no slug gets no picture and keeps the emoji, and so does a game whose shot
// hasn't been taken yet.
function shotFor(url){
  const slug = slugOf(url);
  return slug ? `shots/${slug}.jpg` : null;
}
// Reveal each shot only once it's decoded, and drop any that 404 so the
// tinted emoji panel underneath is what shows. Wired in JS rather than with
// inline onload/onerror attributes to keep the markup free of executable
// strings, same as the rest of this page.
function wireShots(root){
  root.querySelectorAll('.shot').forEach(img=>{
    if(img.complete){ // already cached from a previous visit
      if(img.naturalWidth) img.classList.add('ready'); else img.remove();
      return;
    }
    img.addEventListener('load', ()=>img.classList.add('ready'));
    img.addEventListener('error', ()=>img.remove());
  });
}

/* ---------------- Sort order ----------------
   The catalog is written A–Z by build-catalog.mjs, so
   'az' costs nothing. 'new' leans on the addedAt the route sends along, and
   'shuffle' deals the grid into a fresh order — a repeat press deals again
   rather than doing nothing, because that is what anyone pressing it twice
   is asking for. The choice is remembered the same way the theme is.

   This mode was called 'lucky' and its button said "Surprise me", which is
   now the name of the button below that opens a random game. Two controls
   called the same thing doing different things is the confusion worth the
   rename; the stored value is migrated rather than dropped, so nobody's
   remembered choice silently resets to A–Z on their next visit. */
const SORT_KEY = 'mosArcadeSort';
let allItems = [];
let sortMode = (function(){
  try{
    const v = localStorage.getItem(SORT_KEY);
    if(v === 'lucky') return 'shuffle';
    return ['az','new','shuffle'].includes(v) ? v : 'az';
  }
  catch(e){ return 'az'; }
})();

const SORT_BTNS = { az:'sortAz', new:'sortNew', shuffle:'sortShuffle' };

function sorted(items){
  const copy = items.slice();
  if(sortMode === 'new') return copy.sort((a,b)=>(b.addedAt||0)-(a.addedAt||0));
  if(sortMode === 'shuffle'){
    for(let i=copy.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
    return copy;
  }
  // 'az': trust the server's locale-aware order rather than re-deriving a
  // second, possibly different alphabet here.
  return copy;
}

/* Controls are looked up through here, and one that is not in the document
   is skipped rather than fatal.

   That is not defensiveness for its own sake. index.html and arcade.js are
   two files mos-app's service worker caches separately, so a deploy landing
   between the two fetches pairs the current script with the previous page.
   The rename that introduced Surprise me (#sortLucky became #sortShuffle,
   #luckyBtn arrived) met exactly that pairing in testing: getElementById
   returned null, the top-level addEventListener threw, and the whole
   listing died behind a permanent "Loading…" — every game on the page gone
   because one button had been renamed. A button that is missing and does
   nothing is a failure this page can afford; a blank page is not. */
function byId(id){
  return document.getElementById(id);
}

function setSort(mode){
  sortMode = mode;
  try{ localStorage.setItem(SORT_KEY, mode); }catch(e){}
  Object.entries(SORT_BTNS).forEach(([m,id])=>{
    const btn = byId(id);
    if(btn) btn.setAttribute('aria-pressed', m===mode ? 'true' : 'false');
  });
  if(allItems.length) paint();
}
Object.entries(SORT_BTNS).forEach(([m,id])=>{
  const btn = byId(id);
  if(!btn) return;
  btn.addEventListener('click', ()=>setSort(m));
  btn.setAttribute('aria-pressed', m===sortMode ? 'true' : 'false');
});

/* ---------------- Search ----------------
   Filters the cards live as you type. Entirely client-side: the whole list
   is already in memory (allItems), so there is no request to debounce and
   no spinner to show — every keystroke repaints from what we have.

   fold() is what makes "eclair" find "Éclair" and "PATISSERIE" find
   "Pâtisserie": lowercase, then NFD-decompose and strip the combining
   accents. The same courtesy the A–Z sort pays via localeCompare, paid here
   by hand because includes() has no locale option. */
let query = '';
function fold(s){
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const searchBox = byId('searchBox');
const searchClear = byId('searchClear');
function clearSearch(){
  query = '';
  if(searchBox) searchBox.value = '';
  if(searchClear) searchClear.hidden = true;
  if(allItems.length) paint();
  if(searchBox) searchBox.focus();
}
// Wired only if the box is actually on the page — see byId above for why
// that is worth checking rather than assuming.
if(searchBox){
  searchBox.addEventListener('input', ()=>{
    query = searchBox.value.trim();
    if(searchClear) searchClear.hidden = !query;
    if(allItems.length) paint();
  });
  // Escape in the box wipes it — the keyboard version of the ✕.
  searchBox.addEventListener('keydown', e=>{ if(e.key === 'Escape' && query) { e.preventDefault(); clearSearch(); } });
}
if(searchClear) searchClear.addEventListener('click', clearSearch);

/* ---------------- Today's pick ----------------
   One game shown big above the listing, chosen by the date and by nothing
   else. No server, no stored state, no editor: every visitor loading the
   page on the same day computes the same answer from the list they already
   fetched, and tomorrow they compute a different one.

   It deals rather than draws. A plain "hash the date, take the winner"
   lottery is one line shorter and wrong in the way people actually notice:
   over 84 games it will put the same game up two days running inside the
   first few months, and a repeat looks broken in a way that a boring pick
   never does. So the whole pool is dealt into a per-cycle order and today
   takes one seat of it — every game is featured exactly once before any game
   is featured twice, and the order is dealt fresh on each pass through.

   Two costs, both stated rather than hidden. The cycle length is the number
   of games, so publishing a new game re-deals the current cycle and can move
   the pick mid-day — a jump nobody is watching for, on the rare day a game
   ships. And a game dealt last in one pass can come up early in the next, so
   the tightest possible repeat is a few days; it can only happen on a cycle
   boundary, which at 84 games is roughly quarterly.

   The day is the *visitor's* local calendar day. "Today's pick" that means
   yesterday's game because the server is on UTC is not what the label says. */
function dayNumber(d){
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
// hashOf() is deliberately not reused for the deal. It is a card's tint and
// emoji and must never change, and its polynomial shape leaves one cycle's
// ordering visibly correlated with the next — the same games would drift
// toward the front of pass after pass. This runs its output through the
// murmur3 finalizer with the cycle mixed in, which does not.
function dealKey(cycle, slug){
  let h = hashOf(slug) ^ Math.imul(cycle, 0x9E3779B1);
  h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B);
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
  return (h ^ (h >>> 16)) >>> 0;
}
function pickFor(day){
  // See gamesOnly(). If there are no games, there is no tile.
  const pool = gamesOnly(allItems);
  if(!pool.length) return null;
  const n = pool.length;
  const cycle = Math.floor(day / n);        // which pass through the whole pool
  const seat = ((day % n) + n) % n;         // which day of that pass
  // Sorted by the deal key, tie-broken on the slug so two games that collide
  // on a 32-bit hash still land in one fixed order rather than whichever one
  // the engine's sort happened to leave first.
  const dealt = pool.slice().sort((a,b)=>{
    const sa = slugOf(a.url), sb = slugOf(b.url);
    return dealKey(cycle, sa) - dealKey(cycle, sb) || sa.localeCompare(sb);
  });
  return dealt[seat];
}

const featured = byId('featured');
let shownDay = dayNumber(new Date());

function paintFeatured(){
  // No tile in the markup is not an error, it is an older page. Same
  // reasoning as byId above; the difference here is that paintFeatured runs
  // from paint(), so throwing would take the grid down with it.
  if(!featured) return;
  // Hidden while a search is running. A search is a specific question and a
  // big unrelated game sitting on top of the answer is in the way.
  const pick = query ? null : pickFor(shownDay);
  if(!pick){
    featured.hidden = true;
    featured.innerHTML = '';
    return;
  }
  const h = lookHash(pick);
  const shot = shotFor(pick.url);
  featured.hidden = false;
  // The pick is deliberately still in the grid below as well. A–Z has to be
  // complete — a game going missing from the list on the one day it is
  // featured is the sort of thing that reads as a bug.
  featured.innerHTML = `
    <a class="feat-card" href="${esc(pick.url)}" target="_blank" rel="noopener">
      <div class="top t${h % 8}">
        <span class="emoji">${EMOJI[h % EMOJI.length]}</span>
        ${shot ? `<img class="shot" src="${esc(shot)}" alt="" decoding="async" fetchpriority="high" width="600" height="375">` : ''}
      </div>
      <div class="feat-body">
        <span class="feat-badge">★ Today's pick</span>
        <h2>${esc(pick.name)}</h2>
        ${pick.description ? `<p>${esc(pick.description)}</p>` : ''}
        <span class="feat-play">Play ▶</span>
        <span class="feat-note">A different game every day.</span>
      </div>
    </a>`;
  wireShots(featured);
}

/* Rotating "on its own" has to include the page nobody reloaded. A tab left
   open over midnight, or a laptop shut on Tuesday and opened on Wednesday,
   should be showing Wednesday's game — so the clock is checked at the next
   local midnight and again whenever the tab comes back to the foreground.
   The second check is what actually covers the sleeping laptop: a timer set
   for midnight fires late on wake, if it fires at all. */
function refreshDay(){
  const today = dayNumber(new Date());
  if(today === shownDay) return;
  shownDay = today;
  paintFeatured();
}
function scheduleRollover(){
  const now = new Date();
  // Twenty seconds past, not on the stroke: a timer that fires a hair early
  // would compute yesterday and then sit on it until tomorrow.
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 20);
  setTimeout(()=>{ refreshDay(); scheduleRollover(); }, Math.max(1000, next - now));
}
scheduleRollover();
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) refreshDay(); });

/* ---------------- Surprise me ----------------
   The dice button, and the one control on this page that takes you off it.

   Games only, through gamesOnly() — which is also what makes the url below
   safe to hand to window.open, since nothing that is not an http link gets
   into the pool in the first place.

   It draws from what is on screen. Typing "puzzle" and then pressing the
   dice should hand you a puzzle game; drawing from the whole list there
   would look like the search had been ignored.

   Disabled until the listing has arrived and turns out to contain a game at
   all, so the button is never a thing that can be pressed to no effect. A
   failed fetch leaves it disabled, which is the honest state. */
const luckyBtn = byId('luckyBtn');
let lastLucky = null;

if(luckyBtn) luckyBtn.addEventListener('click', ()=>{
  const pool = gamesOnly(visibleItems());
  if(!pool.length) return;
  // The previous pick is taken out of the hat rather than re-rolled against.
  // Pressing a dice button and being handed the game you were just handed
  // reads as a stuck button, not as luck — and a re-roll only makes that
  // less likely, where removing it makes it impossible.
  const fresh = pool.filter(it=>slugOf(it.url) !== lastLucky);
  const hat = fresh.length ? fresh : pool;
  const pick = hat[Math.floor(Math.random()*hat.length)];
  lastLucky = slugOf(pick.url);
  // New tab, with noopener, exactly as every card on this page opens.
  window.open(pick.url, '_blank', 'noopener');
});

/* ---------------- Category chips ----------------
   One chip per category the listing actually contains, plus All. Built from
   the data rather than written out here, so the day a game is filed under a
   seventh category the chip appears on its own — the server's map
   (arcade-categories.js) stays the one place categories are decided.

   The filter itself is a CSS class and nothing else. Every card is already
   in the document by the time a chip can be pressed, so pressing one flips
   .cat-hidden on the cards that do not match and stops: no request, no
   re-render, no reflow beyond the grid closing up. That matters at ~83
   cards, each carrying a screenshot — rebuilding the grid per chip press
   would drop and re-request every image on screen.

   The choice is remembered the way the theme and the sort are, and checked
   against the live listing on the way back in: a category that has since
   been emptied would otherwise restore as a pressed chip showing nothing. */
const CAT_ALL = '__all__';
const CAT_KEY = 'mosArcadeCategory';
// The order the chips appear in, mirroring ARCADE_CATEGORIES on the server.
// A category not in this list still gets a chip — it files after the known
// ones — so the two lists disagreeing is a cosmetic fault, not a missing
// control.
const CAT_ORDER = ['Puzzle','Action','Word','Chill','Arcade','Kids'];
const UNCATEGORIZED = 'Uncategorized';

const catBar = byId('catBar');
const catEmpty = byId('catEmpty');
const catEmptyText = byId('catEmptyText');

let activeCat = (function(){
  try{ return localStorage.getItem(CAT_KEY) || CAT_ALL; }
  catch(e){ return CAT_ALL; }
})();

// An entry's category, with the same fallback the server uses — belt and
// braces for a listing served by an older build that carries no category
// field at all, which would otherwise put every card in a chip-less limbo.
function catOf(it){
  const c = String(it.category ?? '').trim();
  return c || UNCATEGORIZED;
}
function inActiveCat(it){
  return activeCat === CAT_ALL || catOf(it) === activeCat;
}

/* Every category present, in chip order: the known ones in the order above,
   then anything unrecognised alphabetically, then Uncategorized last. It is
   last rather than absent because "not filed yet" is the one category whose
   chip is also a to-do list. */
function categoriesIn(items){
  const seen = new Set(items.map(catOf));
  const known = CAT_ORDER.filter(c=>seen.has(c));
  const extra = [...seen].filter(c=>!CAT_ORDER.includes(c) && c !== UNCATEGORIZED)
                         .sort((a,b)=>a.localeCompare(b, undefined, {sensitivity:'base'}));
  return [...known, ...extra, ...(seen.has(UNCATEGORIZED) ? [UNCATEGORIZED] : [])];
}

function syncChips(){
  if(!catBar) return;
  catBar.querySelectorAll('.cat-btn').forEach(b=>{
    b.setAttribute('aria-pressed', b.dataset.cat === activeCat ? 'true' : 'false');
  });
}

function setCategory(cat){
  activeCat = cat;
  try{ localStorage.setItem(CAT_KEY, cat); }catch(e){}
  syncChips();
  applyCategoryFilter();
  // Surprise me draws from what is on screen, and the chips have just
  // changed what that is — a category with no games in it leaves nothing to
  // deal, same as a search that matches nothing.
  if(luckyBtn) luckyBtn.disabled = !gamesOnly(visibleItems()).length;
}

/* Builds the row once, from the listing. createElement rather than innerHTML
   because a category is a string the server hands over and this page has a
   standing rule about not building executable-looking markup out of values
   it did not write; textContent sidesteps the question entirely.

   One chip and All is a control that can only ever say the same thing twice,
   so the row stays hidden until there are at least two categories to choose
   between. */
function buildChips(items){
  if(!catBar) return;
  const cats = categoriesIn(items);
  if(cats.length < 2){ catBar.hidden = true; return; }
  // A remembered category that is no longer in the listing falls back to All
  // rather than restoring as a pressed chip over an empty grid.
  if(activeCat !== CAT_ALL && !cats.includes(activeCat)) activeCat = CAT_ALL;
  const frag = document.createDocumentFragment();
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'cat-btn cat-all';
  all.dataset.cat = CAT_ALL;
  all.textContent = 'All';
  frag.appendChild(all);
  for(const cat of cats){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cat-btn';
    b.dataset.cat = cat;
    b.textContent = cat;
    frag.appendChild(b);
  }
  catBar.replaceChildren(frag);
  catBar.hidden = false;
  syncChips();
  // One listener for the whole row rather than one per chip: the set is
  // rebuilt only here, but a delegated handler cannot be left behind on a
  // detached button if that ever changes.
  catBar.addEventListener('click', e=>{
    const btn = e.target.closest('.cat-btn');
    if(btn && btn.dataset.cat !== activeCat) setCategory(btn.dataset.cat);
  });
}

/* The filter. Reads the cards that are already there and writes one class.
   Nothing is created, parsed or fetched. */
function applyCategoryFilter(){
  const content = byId('content');
  if(!content) return;
  // Only ever runs over a painted grid. When #content is showing the search's
  // own "no game called…" panel there are no cards, and no second empty box
  // belongs on top of it.
  const isGrid = content.classList.contains('grid');
  let shown = 0;
  content.querySelectorAll('.card').forEach(card=>{
    const hide = activeCat !== CAT_ALL && card.dataset.cat !== activeCat;
    card.classList.toggle('cat-hidden', hide);
    if(!hide) shown++;
  });
  if(!catEmpty) return;
  const empty = isGrid && shown === 0;
  if(empty && catEmptyText){
    const where = activeCat === CAT_ALL ? 'here' : `in ${activeCat}`;
    catEmptyText.textContent = query
      ? `Nothing ${where} matches “${query}” — try another category, or clear the search.`
      : `No games ${where} yet — pick another category, or tap All.`;
  }
  catEmpty.hidden = !empty;
}

// What is on screen right now, search and chips both applied. matching()
// above answers only the search half; this is the one Surprise me draws
// from, so the dice never hands back a game the chips are hiding.
function visibleItems(){
  return matching().filter(inActiveCat);
}

async function load(){
  const content = document.getElementById('content');
  let items;
  try{
    // games.json, not an API. Regenerate it with tools/build-catalog.mjs
    // after adding or removing a folder under games/.
    const res = await fetch('games.json');
    if(!res.ok) throw new Error('bad response');
    items = await res.json();
  }catch(err){
    content.className = 'error';
    content.innerHTML = `<div class="big">⚠️</div><p>Couldn't load the arcade list right now. Try refreshing in a moment.</p>`;
    return;
  }
  if(!Array.isArray(items) || !items.length){
    content.className = 'empty';
    content.innerHTML = `<div class="big">🕹️</div><p>Nothing's been made public yet — check back soon!</p>`;
    return;
  }
  allItems = items;
  // Before the first paint, so the cards it paints are filtered on arrival
  // rather than flashing the whole grid and then hiding two thirds of it.
  buildChips(items);
  // A listing with entries but no actual games leaves the dice disabled —
  // there would be nothing for it to deal.
  if(luckyBtn) luckyBtn.disabled = !gamesOnly(visibleItems()).length;
  paint();
}

/* What is on screen right now: the whole list, or the part of it a search
   has narrowed it to. Two callers need the same answer — the grid that
   paints it, and Surprise me, which draws from what the visitor can actually
   see rather than from games their search has just ruled out.

   Two fields, matched two different ways, and the difference is the whole
   design of this function.

   The name is matched with includes(), anywhere: "doku" should find "Cozy
   Sudoku", because a half-remembered fragment of a title is the commonest
   thing anyone types here.

   The category is matched as a *prefix*, and only from two letters. Both
   halves of that are there to keep the feature from making search worse:

     · includes() on the category would mean "id" matches every game filed
       under Kids, which is not something anyone typing "id" was asking for.
       A prefix is how people actually name a category — "puz", "puzz",
       "puzzle" — and nothing else lands on one by accident.
     · One letter is a title-narrowing gesture, not a category name, and a
       single "a" would otherwise pull in every Action and Arcade game and
       bury the titles actually starting to match. The floor is two.

   Worth knowing that the chip row below the box already filters by category,
   and does it better — it is exhaustive, it says what the categories are,
   and it composes with a search (visibleItems). This is the shortcut for
   somebody who types "word" without looking for the chip, not a replacement
   for it. */
const CAT_QUERY_MIN = 2;
function matchesQuery(it){
  const q = fold(query);
  if(fold(it.name).includes(q)) return true;
  return q.length >= CAT_QUERY_MIN && fold(catOf(it)).startsWith(q);
}
function matching(){
  return query ? allItems.filter(matchesQuery) : allItems;
}

function paint(){
  const content = document.getElementById('content');
  const matches = matching();

  // First, and outside every branch below: the tile has to be taken down for
  // the no-matches state too, not only for the ones that reach the grid.
  paintFeatured();

  // Said out loud for screen readers on every repaint, quietly.
  const count = document.getElementById('searchCount');
  if(count) count.textContent = query ? `${matches.length} game${matches.length === 1 ? '' : 's'} match “${query}”` : '';

  if(query && !matches.length){
    // Same styled empty state the page already uses, with the query echoed
    // back — through esc(), since it is the visitor's own text.
    content.className = 'empty';
    content.innerHTML = `<div class="big">🔍</div><p>No game called “${esc(query)}” here — try fewer letters, or clear the search.</p>`;
    // One empty state at a time: this branch owns the message, so the
    // category box comes down rather than stacking under it.
    applyCategoryFilter();
    return;
  }

  content.className = 'grid';
  content.innerHTML = sorted(matches).map(it=>{
    const h = lookHash(it);
    const shot = shotFor(it.url);
    // alt="" on purpose: the card's own <h3> already names the game, so a
    // screen reader announcing the picture too would just say it twice.
    return `
    <a class="card" data-cat="${esc(catOf(it))}" href="${esc(it.url)}" target="_blank" rel="noopener">
      <div class="top t${h % 8}">
        <span class="emoji">${EMOJI[h % EMOJI.length]}</span>
        ${shot ? `<img class="shot" src="${esc(shot)}" alt="" loading="lazy" decoding="async" width="600" height="375">` : ''}
      </div>
      <div class="body">
        ${it.platform ? `<span class="pill">${esc(it.platform)}</span>` : ''}
        <h3>${esc(it.name)}</h3>
        ${it.description ? `<p>${esc(it.description)}</p>` : '<p>&nbsp;</p>'}
      </div>
      <div class="play-row"><span class="play-btn">Play ▶</span></div>
    </a>`;
  }).join('');
  wireShots(content);
  // Sorting and searching rebuild the grid, which throws away the .cat-hidden
  // classes along with the cards that carried them. Re-applied here so the
  // chosen chip survives a sort — and so the very first paint arrives already
  // filtered.
  applyCategoryFilter();
}
load();

})();
