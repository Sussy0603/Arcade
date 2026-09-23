// What sort of game each game is, for the Arcade's filter chips.
//
// Why this is a file and not a column
// -----------------------------------
// There is no games table. A game is a folder under ../../Games (catalog.js
// finds it), and the Arcade listing is a *projection* of it: registry.js
// copies five fields into the `arcade` collection of the generic `records`
// table, where `data` is a JSON blob. So the two obvious places to put a
// category are both wrong:
//
//   A column on `records` — that table is shared by ~25 collections
//     (tickets, clients, revenue, notes…). A `category` column would be NULL
//     on every row but these eighty-odd and would still be written on every
//     insert MOS makes. The generic table is the point of that design.
//
//   A field in the JSON blob — which is where it would belong, except that
//     the blob is rewritten wholesale from the browser. mos-app keeps its
//     Registry in localStorage and pushes the opted-in set on every login
//     (syncAllArcadeEntries → PUT /api/arcade/:id with exactly five fields,
//     js/03-dashboard-apps.js). A category written into the row would
//     survive until the next person signed in, and then quietly vanish.
//     Nobody would connect the two events.
//
// So the category is *derived at serve time*, keyed on the one identifier
// that is genuinely stable — the /games/<slug> a game's URL ends in, which
// is already what the server uses to tell one game from another (arcadeKey
// in api.js). buildArcadeEntries() stamps it on. That makes this file the
// same kind of thing as catalog.js's ALIASES: a small hand-kept map of the
// answers that cannot be read off the disk, sitting next to the code that
// reads everything else off the disk.
//
// A stored blob value still wins if one ever appears (see api.js), so the
// day someone adds a category picker to the Registry, this map becomes the
// default rather than the law, and no migration is needed to get there.
//
// Adding a game: it needs no entry here. An unlisted slug lands in
// "Uncategorized", which is a visible, chip-shaped invitation to come back
// and file it — quieter than a crash and louder than silence.

/* The categories, in the order their chips appear. Order is editorial, not
   alphabetical: the three big genre buckets first, then the moods. The
   Arcade page keeps its own copy of this order — it only ever receives
   strings — so a category added here should be added there too, or it
   simply files after the known ones instead of in its intended place. */
export const ARCADE_CATEGORIES = ['Puzzle', 'Action', 'Word', 'Chill', 'Arcade', 'Kids'];

// Where a game with no entry below goes. Deliberately a real category with
// a real chip rather than an absent field: "we haven't decided yet" is
// information, and hiding it would make the unfiled games unreachable
// through the one control on the page that exists to reach games.
export const UNCATEGORIZED = 'Uncategorized';

/* slug → category, for every game currently under ../../Games.
   The slug is what catalog.js derived, not the folder name, so the seven
   aliased games are filed under the name they are *served* as (Chessey is
   rookery, Poolioo is sidespin — see ALIASES in catalog.js). Getting that
   wrong is silent: the game lands in Uncategorized and looks unfiled. */
const BY_SLUG = {
  // --- Puzzle: something to work out, at your own speed ---------------
  backgammon: 'Puzzle',
  battleship: 'Puzzle',
  blockjam: 'Puzzle',
  connect4: 'Puzzle',
  'cozy-sudoku': 'Puzzle',
  cubelle: 'Puzzle',              // build the solid three silhouettes agree on
  dots: 'Puzzle',                 // Dots Connect
  dotsboxes: 'Puzzle',
  doublet: 'Puzzle',              // tile merges, despite the word-game name
  g2048: 'Puzzle',
  gomoku: 'Puzzle',
  gridlock: 'Puzzle',
  hexfit: 'Puzzle',
  kakurasu: 'Puzzle',
  lazer: 'Puzzle',                // served as lazer, titled "Prism Path"
  lightsout: 'Puzzle',
  mancala: 'Puzzle',
  mathbrush: 'Puzzle',            // Math Rush, one of the STeamWorkS set
  maze: 'Puzzle',
  minesweeper: 'Puzzle',
  morris: 'Puzzle',               // Nine Men's Morris
  neuron: 'Puzzle',               // "Neuron — Brain Training"
  numchain: 'Puzzle',             // Number Chain
  oddone: 'Puzzle',               // Odd One Out
  pipes: 'Puzzle',
  'procedural-jigsaw': 'Puzzle',
  rookery: 'Puzzle',              // the Chessey folder
  sequence: 'Puzzle',
  slide15: 'Puzzle',
  solitaire: 'Puzzle',
  sudoku6: 'Puzzle',
  unblock: 'Puzzle',
  watersort: 'Puzzle',

  // --- Action: timing and reflex, a run you can lose ------------------
  'color-gate': 'Action',
  'flappy-fish': 'Action',
  'orbit-jump': 'Action',
  'pin-drop': 'Action',           // land pins in a turning ring
  'reflex-grid': 'Action',

  // --- Word: letters are the mechanic --------------------------------
  anagram6: 'Word',
  emojiriddle: 'Word',
  'letter-safari-word-builder': 'Word',   // the SafariSpell folder
  'typing-sprint': 'Word',
  'word-grove': 'Word',

  // --- Chill: no fail state, no clock --------------------------------
  antics: 'Chill',                // ant-colony idle, earns while away
  bakery: 'Chill',                // Butterfold
  bakeyclicker: 'Chill',          // Petite Pâtisserie
  beachcomber: 'Chill',
  'bird-feeder': 'Chill',
  campfire: 'Chill',              // The Long Night
  'clover-cove': 'Chill',         // fish, dig, decorate at your own pace
  'constellation-connect': 'Chill',
  driftsand: 'Chill',             // rake and smooth a sand garden
  'firefly-jar': 'Chill',
  fishies: 'Chill',
  'flower-merge': 'Chill',
  'kaleidoscope-painter': 'Chill',
  'lantern-festival': 'Chill',
  mossling: 'Chill',
  numbrush: 'Chill',              // Colour by Numbers; the NumbBrush folder
  'paint-by-number': 'Chill',
  'pixel-garden': 'Chill',
  pixling: 'Chill',               // a pixel-sprite maker, not a game to lose
  'post-office': 'Chill',         // Wickham Post Office
  'potion-mixing': 'Chill',       // Wickbrew
  purrista: 'Chill',              // Cat Café Tycoon
  'quilt-block-designer': 'Chill',
  'soundscape-mixer': 'Chill',
  'stained-glass-maker': 'Chill',
  'tea-shop': 'Chill',            // Steepwell
  'tidy-up': 'Chill',
  'tile-town': 'Chill',

  // --- Arcade: the cabinet classics, one more go ----------------------
  higherlower: 'Arcade',
  'pong-solo': 'Arcade',
  sidespin: 'Arcade',             // the Poolioo folder
  'simon-says': 'Arcade',
  'stack-slice': 'Arcade',
  yahtzee: 'Arcade',

  // --- Kids: made for small hands, usually teaching something ---------
  'balloon-pop': 'Kids',          // pop by colour and by letter
  'clock-school': 'Kids',
  'colors-shapes': 'Kids',
  'marble-run': 'Kids',
  'memory-match': 'Kids',
  'numberland-farm': 'Kids',
  'reading-rally': 'Kids'         // the ReadingRally folder
};

/* The slug out of a listing entry's URL — the same read arcadeKey() makes
   in api.js, kept local rather than imported because api.js imports this
   file and a cycle between the two would be a boot-order bug waiting for
   the day somebody reorders the imports. Anything that is not a /games/
   link (an app or an outside site somebody opted into the Arcade by hand)
   has no slug, and falls through to Uncategorized. */
function slugOf(url) {
  const m = String(url ?? '').trim().toLowerCase().replace(/\/+$/, '').match(/\/games\/([a-z0-9-]+)(?:[/?#]|$)/);
  return m ? m[1] : null;
}

export function categoryForSlug(slug) {
  return (slug && BY_SLUG[slug]) || UNCATEGORIZED;
}

export function categoryForUrl(url) {
  return categoryForSlug(slugOf(url));
}

/* One entry's category, stored value first.
   A blob that already carries a category keeps it, so a future Registry
   picker beats this map without needing it emptied out. The string is
   trimmed and length-capped before it is trusted, because it arrives from a
   browser: it becomes a chip label and a CSS-class-free data attribute on
   the public page, and an unbounded one would be a 2000-character button. A
   value that is neither a known category nor Uncategorized is still allowed
   through — the Arcade builds its chips from whatever it receives, which is
   what makes a seventh category a one-line change here. */
export function categoryFor(entry) {
  const stored = typeof entry?.category === 'string' ? entry.category.trim().slice(0, 40) : '';
  return stored || categoryForUrl(entry?.url);
}
