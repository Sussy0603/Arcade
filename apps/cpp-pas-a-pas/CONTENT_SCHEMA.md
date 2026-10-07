# Content format — C++ Pas à Pas

One JSON file per teaching week: `public/content/semaine-XX.json` (XX = 01, 02, 03, 05, 08, 09, 11, 12, 13).

## Audience & voice (IMPORTANT)
- Learner: first-semester college student (Quebec, cégep course 420-1C6 "Programmation structurée", C++ in Visual Studio 2026, console apps). Dyslexic-friendly: short sentences, one idea per chunk, simple words.
- ALL text in **French** (Quebec-friendly, but standard French terms from the course).
- Tone: fun, a bit silly. The mascot **Segfault** (a glitchy cat) is a chaotic cheerleader: hype, jokes, cats/croquettes in examples, but never mean. Wrong answers are "Erreur de compilation... mais pas de toi 😸" style — never harsh.
- Emojis: allowed sparingly (max 1 per chunk).

## Code style (match the teacher)
- `#include <iostream>` + `using namespace std;` (never `std::cout`, except when teaching namespaces in week 2)
- Braces `{` on their **own new line** (Allman style), 4-space indent
- Variables & functions camelCase (`nbEtudiants`, `calculerMoyenne`), constants UPPER_SNAKE_CASE (`const int NB_MAX = 10;`)
- `'\n'` for newlines (not endl), `++i` in for loops
- C++20 (std::format is allowed from week 2)
- Snippets can be fragments (no `main`) when obvious — but must compile once wrapped in `int main() { ... }` with the needed includes.

## Inline text markup (NO raw HTML)
- `**gras**` for bold
- `` `code` `` for inline code
- `\n` inside strings = line break
Nothing else. Do not use < > & raw HTML tags.

## File shape
```json
{
  "week": 5,
  "title": "Les boucles",
  "notions": [ NOTION, ... ],
  "aideMemoire": [ { "title": "while", "code": "while (condition)\n{\n    ...\n}", "note": "Teste AVANT. Peut faire 0 tour." } ],
  "extraPuzzles": [ PUZZLE, ... ]      // optional (week 5: 10 extra loop puzzles)
}
```

### NOTION
```json
{
  "id": "s5-for",                    // unique, "s<week>-<slug>"
  "title": "La boucle for",
  "lesson": [ CHUNK, ... ],          // 4 to 6 chunks
  "cards": [ { "q": "...", "a": "..." } ],        // 3 to 4 flashcards
  "puzzles": [ PUZZLE, ... ],        // exactly 5, mix the types
  "explain": [ { "q": "Pourquoi ... ?", "a": "model answer, 2-4 short sentences" } ]  // 2 oral-interview questions (Volet B style: 'why/how/what happens if')
}
```

### CHUNK types (one small idea each)
```json
{ "type": "talk", "text": "Segfault explains one idea, 1-3 short sentences." }
{ "type": "tip",  "text": "⚠️ Piège classique : ..." }
{ "type": "code", "text": "short intro", "code": "multi-line C++", "lines": ["what line 1 does", "what line 2 does", ...], "output": "exact console output or empty string" }
{ "type": "memory", "text": "short intro", "boxes": [ { "name": "age", "value": "20", "type": "int", "size": "4 octets" } ] }
```
- `code.lines` must have EXACTLY one entry per line of `code` (use "" for a brace line if nothing to say, or "Ouvre le bloc." etc.).
- `output` must be the EXACT output (verified by compiling). If the snippet reads input, say in `text` what the user types.
- Use `memory` chunks where the course says "fonctionnement en mémoire" (variables, arrays, function calls, structs, vectors, strings).

### PUZZLE types (every puzzle has `hint` and `explain`)
```json
{ "type": "predict", "q": "Qu'est-ce qui s'affiche ?", "code": "...", "choices": ["A","B","C","D"], "answer": 0, "hint": "...", "explain": "..." }
{ "type": "predict-typed", "q": "Écris exactement ce qui s'affiche.", "code": "...", "answer": "10 6 2", "hint": "...", "explain": "..." }
{ "type": "bug", "q": "Quelle ligne contient l'erreur ?", "code": "...", "answer": 2, "hint": "...", "explain": "..." }     // answer = 0-based line index
{ "type": "fill", "q": "Complète le code pour ...", "code": "... ___ ...", "choices": ["<", "<=", ">", "!="], "answer": 1, "hint": "...", "explain": "..." }   // exactly one ___ in code
{ "type": "order", "q": "Remets les lignes dans le bon ordre.", "lines": ["line in correct order 1", "..."], "hint": "...", "explain": "..." }  // 4-7 lines, app shuffles them
{ "type": "normes", "q": "Quel nom respecte les normes ?", "choices": [...], "answer": 0, "hint": "...", "explain": "..." }  // optional, naming/style questions
```
- `predict-typed` answers are compared ignoring extra spaces at ends and collapsing multiple spaces; case matters. Keep typed answers SHORT (one line).
- For `predict`, wrong choices must be plausible classic mistakes (off-by-one, integer division, missing break...).
- `bug` puzzles: the bug can be a compile error (missing `;`, wrong type) OR a logic bug (infinite loop, off-by-one) — say which in `explain`.
- `explain` = why the right answer is right AND why the common wrong answer is wrong. 1-3 sentences.

## Verification (MANDATORY)
Every `code` / puzzle `code` must be compiled with `g++ -std=c++20 -Wall` (wrapped in main with includes if a fragment — except `bug` puzzles that are meant to fail) and every `output` / `predict` answer / `predict-typed` answer must match the real program output exactly. For bug puzzles meant as compile errors, confirm they DO fail; for logic bugs confirm the behavior.
Validate JSON with `python3 -m json.tool`.
