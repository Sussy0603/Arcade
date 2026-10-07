# C++ Pas à Pas 🐱⚡

Study app for the cégep course **420-1C6 Programmation structurée (C++)**, with Segfault, a glitchy cat.
French, phone-first, installable (PWA). Google sign-in and online saving through Firebase (free Spark plan).

> Unofficial: made by a student, for students. The course plan and Léa remain the reference.

## What's inside

- **9 teaching weeks**: 52 notions, each one with 4 tabs (Leçon / Cartes / Puzzles / Explique-moi)
- **270 puzzles**, 6 types: predict the output, typed output, find the bug, fill in the code, reorder the lines, standards (normes)
- **Loop tools** (week 5): step-by-step tracer (autoplay + guess mode), trace tables, star patterns, menu builder
- Aide-mémoire, Lexique, Normes, Points faibles, **Examen blanc** (15 questions / 20 min), Défi du jour
- Profil: nickname, avatar, colors, Segfault's look, badges, exam dates, delete account

Every C++ snippet was compiled with `g++ -std=c++20 -Wall` to check the outputs and answers.

## How the code is organised (plain version)

| File | What it does |
|---|---|
| `public/index.html` | The page shell: tab bar, celebration, pop-up sheet |
| `public/css/style.css` | The whole neon look. Colours are variables at the top |
| `public/js/app.js` | Navigation (`#/home`, `#/notion/...`) and **every screen** |
| `public/js/quiz.js` | Draws one puzzle and checks the answer (all 6 types) |
| `public/js/tools.js` | The 4 loop tools |
| `public/js/store.js` | Sign-in + saving (Firebase, or "mode local" with no config) |
| `public/js/content.js` | Loads the course files, dates, défi du jour |
| `public/js/ui.js` | Helpers: C++ colours, the Segfault drawing, toasts, sounds |
| `public/content/*.json` | **All the course content** (edit these to fix or add questions) |
| `firestore.rules` | Security: who can read and write what |
| `tools/*.py` | Scripts that generate and check some of the content |

Content format: see `CONTENT_SCHEMA.md`.

## Test locally (no Firebase)

```bash
cd public
python -m http.server 8000
# open http://localhost:8000
```

With no config in `public/js/config.js`, the app runs in **MODE LOCAL** (progress saved in the browser).

## Put it online (Firebase)

1. Create a Firebase project, add a **Web app**, and paste its `firebaseConfig` into `public/js/config.js`
2. Authentication → turn on **Google**
3. Firestore → create the database (production mode)
4. Put your email in `firestore.rules` (`isAdmin`) and in `ADMIN_EMAILS` (config.js)
5. `npm install -g firebase-tools`, then `firebase login`, then `firebase deploy`

## Later (v2)

- Study reminders (phone notifications)
- More weeks of content and explanatory videos
- Study groups
