// What sort of app each app is, for the Apps section's filter chips.
//
// The sibling of arcade-categories.mjs, and deliberately a much smaller
// thing than it. That file is a copy of MOS's own map, kept in step by hand
// because the games it files are also served by MOS. Nothing on the platform
// files apps, so this map answers to nobody but this folder — edit it freely.
//
// There are two ways an app gets a category, and the app's own page wins:
//
//   1. A <meta> tag in the app's HTML:
//
//          <meta name="category" content="Money">
//
//      Self-filing. The app carries its own answer, so an app that moves
//      between folders — or arrives from somewhere else entirely — keeps it
//      without anybody remembering to come back here.
//
//   2. The map below, keyed on the app's slug (its folder name).
//
// An app that does neither lands in "Uncategorized", the same as a game
// does: a visible, chip-shaped invitation to come back and file it.
//
// One chip on its own is a control that can only say the same thing twice,
// so until at least two categories are in play the Apps chip row does not
// appear at all. An unfiled set of apps is therefore not a mess on screen —
// it is simply a grid with no chips over it.

/* The categories, in the order their chips appear. Order is editorial, not
   alphabetical. Rename these, cut them, add to them — nothing outside this
   folder reads them.

   arcade.js keeps its own copy of this order (APP_CAT_ORDER), because it
   only ever receives strings from apps.json and never imports this file. A
   category added here and not there still gets a chip; it just files after
   the known ones rather than in its intended place. */
export const APP_CATEGORIES = ['Productivity', 'Tools', 'Money', 'Learning', 'Health', 'Fun'];

// Where an app with no entry and no <meta> tag goes.
export const UNCATEGORIZED = 'Uncategorized';

/* slug → category, for apps that do not carry their own <meta name="category">.
   The slug is the folder name under apps/.

   Empty on purpose: there are no apps yet. The shape, for when there are:

     const BY_SLUG = {
       'invoice-builder': 'Money',
       'shift-planner':   'Productivity',
     };
*/
const BY_SLUG = {
};

export function categoryForSlug(slug) {
  return (slug && BY_SLUG[slug]) || UNCATEGORIZED;
}
