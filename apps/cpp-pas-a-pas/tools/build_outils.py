"""Builds public/content/outils-boucles.json (tracers, trace tables, star patterns, menu builder)
and verifies every program with g++."""
import json, subprocess, tempfile, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'content', 'outils-boucles.json')

def run_cpp(body):
    src = '#include <iostream>\nusing namespace std;\nint main()\n{\n' + body + '\n    return 0;\n}\n'
    d = tempfile.mkdtemp()
    open(f'{d}/a.cpp', 'w').write(src)
    subprocess.run(['g++', '-std=c++20', '-Wall', '-Werror', f'{d}/a.cpp', '-o', f'{d}/a'], check=True)
    return subprocess.run([f'{d}/a'], capture_output=True, text=True, timeout=5).stdout

# ---------------- TRACERS ----------------
class T:
    def __init__(self): self.steps = []; self.out = ''
    def add(self, line, v, note, change=None):
        s = {'line': line, 'vars': dict(v), 'out': self.out, 'note': note}
        if change: s['change'] = change
        self.steps.append(s)

def tracer_nested():
    code = "for (int i = 1; i <= 2; ++i)\n{\n    for (int j = 1; j <= 3; ++j)\n    {\n        cout << '*';\n    }\n    cout << '\\n';\n}"
    t = T(); i = 1
    t.add(0, {'i': i, 'j': None}, 'Départ : i = 1', {'var': 'i', 'value': 1})
    while True:
        t.add(0, {'i': i, 'j': None}, f'Test : {i} <= 2 → {"vrai" if i <= 2 else "faux"}')
        if not i <= 2: break
        j = 1
        t.add(2, {'i': i, 'j': j}, 'Départ : j = 1', {'var': 'j', 'value': 1})
        while True:
            t.add(2, {'i': i, 'j': j}, f'Test : {j} <= 3 → {"vrai" if j <= 3 else "faux"}')
            if not j <= 3: break
            t.out += '*'; t.add(4, {'i': i, 'j': j}, "Affiche '*'")
            j += 1; t.add(2, {'i': i, 'j': j}, f'++j → j = {j}', {'var': 'j', 'value': j})
        t.out += '\n'; t.add(6, {'i': i, 'j': None}, "Retour à la ligne. j n'existe plus ici (portée) !")
        i += 1; t.add(0, {'i': i, 'j': None}, f'++i → i = {i}', {'var': 'i', 'value': i})
    t.add(7, {'i': None, 'j': None}, 'Fin ! 2 lignes de 3 étoiles ⚡')
    return {'id': 'tr-imbriquees', 'title': 'for imbriqués (rectangle)', 'code': code, 'vars': ['i', 'j'], 'steps': t.steps}, code

def tracer_triangle():
    code = "for (int ligne = 1; ligne <= 3; ++ligne)\n{\n    for (int col = 1; col <= ligne; ++col)\n    {\n        cout << '*';\n    }\n    cout << '\\n';\n}"
    t = T(); L = 1
    t.add(0, {'ligne': L, 'col': None}, 'Départ : ligne = 1', {'var': 'ligne', 'value': 1})
    while True:
        t.add(0, {'ligne': L, 'col': None}, f'Test : {L} <= 3 → {"vrai" if L <= 3 else "faux"}')
        if not L <= 3: break
        c = 1
        t.add(2, {'ligne': L, 'col': c}, 'Départ : col = 1', {'var': 'col', 'value': 1})
        while True:
            t.add(2, {'ligne': L, 'col': c}, f'Test : col {c} <= ligne {L} → {"vrai" if c <= L else "faux"}')
            if not c <= L: break
            t.out += '*'; t.add(4, {'ligne': L, 'col': c}, "Affiche '*'")
            c += 1; t.add(2, {'ligne': L, 'col': c}, f'++col → col = {c}', {'var': 'col', 'value': c})
        t.out += '\n'; t.add(6, {'ligne': L, 'col': None}, 'Retour à la ligne')
        L += 1; t.add(0, {'ligne': L, 'col': None}, f'++ligne → ligne = {L}', {'var': 'ligne', 'value': L})
    t.add(7, {'ligne': None, 'col': None}, "Fin ! Un triangle : la boucle intérieure dépend de ligne 🔺")
    return {'id': 'tr-triangle', 'title': 'Triangle (col <= ligne)', 'code': code, 'vars': ['ligne', 'col'], 'steps': t.steps}, code

def tracer_while():
    code = "int n = 3;\nwhile (n > 0)\n{\n    cout << n << ' ';\n    --n;\n}\ncout << \"Go!\";"
    t = T(); n = 3
    t.add(0, {'n': n}, 'n = 3', {'var': 'n', 'value': 3})
    while True:
        t.add(1, {'n': n}, f'Test : {n} > 0 → {"vrai" if n > 0 else "faux"}')
        if not n > 0: break
        t.out += f'{n} '; t.add(3, {'n': n}, f'Affiche {n} et un espace')
        n -= 1; t.add(4, {'n': n}, f'--n → n = {n}', {'var': 'n', 'value': n})
    t.out += 'Go!'; t.add(6, {'n': n}, 'Sortie de la boucle : affiche Go! 🚀')
    return {'id': 'tr-while', 'title': 'while : compte à rebours', 'code': code, 'vars': ['n'], 'steps': t.steps}, code

def tracer_break():
    code = "for (int i = 1; i <= 10; ++i)\n{\n    if (i * i > 10)\n    {\n        break;\n    }\n    cout << i << ' ';\n}"
    t = T(); i = 1
    t.add(0, {'i': i}, 'Départ : i = 1', {'var': 'i', 'value': 1})
    while True:
        t.add(0, {'i': i}, f'Test : {i} <= 10 → {"vrai" if i <= 10 else "faux"}')
        if not i <= 10: break
        t.add(2, {'i': i}, f'Test : {i}*{i} = {i*i} > 10 → {"vrai" if i*i > 10 else "faux"}')
        if i * i > 10:
            t.add(4, {'i': i}, 'break ! On sort de la boucle tout de suite 💥')
            break
        t.out += f'{i} '; t.add(6, {'i': i}, f'Affiche {i}')
        i += 1; t.add(0, {'i': i}, f'++i → i = {i}', {'var': 'i', 'value': i})
    t.add(7, {'i': None}, 'Fin. i n\'existe plus après la boucle.')
    return {'id': 'tr-break', 'title': 'for + break', 'code': code, 'vars': ['i'], 'steps': t.steps}, code

tracers = []
for fn in (tracer_while, tracer_nested, tracer_triangle, tracer_break):
    tr, code = fn()
    real = run_cpp(code)
    assert real == tr['steps'][-1]['out'], (tr['id'], repr(real), repr(tr['steps'][-1]['out']))
    tracers.append(tr)

# ---------------- TRACE TABLES ----------------
def table(tid, title, code, cols, body_for_check, hint):
    # body_for_check prints the column values after each turn, space-separated, one line per turn
    rows = [list(map(int, l.split())) for l in run_cpp(body_for_check).strip().split('\n')]
    return {'id': tid, 'title': title, 'code': code, 'columns': cols, 'rows': rows, 'hint': hint}

traceTables = [
    table('tt-somme', 'Somme de 1 à 4',
          "int s = 0;\nfor (int i = 1; i <= 4; ++i)\n{\n    s = s + i;\n}",
          ['i', 's'],
          "int s = 0;\nfor (int i = 1; i <= 4; ++i)\n{\n    s = s + i;\n    cout << i << ' ' << s << '\\n';\n}",
          's = ancien s + i'),
    table('tt-facto', 'Factorielle de 4',
          "int f = 1;\nfor (int i = 1; i <= 4; ++i)\n{\n    f = f * i;\n}",
          ['i', 'f'],
          "int f = 1;\nfor (int i = 1; i <= 4; ++i)\n{\n    f = f * i;\n    cout << i << ' ' << f << '\\n';\n}",
          'f = ancien f × i'),
    table('tt-double', 'Doubler jusqu\'à 20',
          "int x = 1;\nint tours = 0;\nwhile (x < 20)\n{\n    x = x * 2;\n    ++tours;\n}",
          ['tours', 'x'],
          "int x = 1;\nint tours = 0;\nwhile (x < 20)\n{\n    x = x * 2;\n    ++tours;\n    cout << tours << ' ' << x << '\\n';\n}",
          'x double à chaque tour ; la boucle s\'arrête dès que x >= 20'),
    table('tt-rebours', 'Compte à rebours par 3',
          "int n = 10;\nint compte = 0;\ndo\n{\n    n = n - 3;\n    ++compte;\n} while (n > 0);",
          ['compte', 'n'],
          "int n = 10;\nint compte = 0;\ndo\n{\n    n = n - 3;\n    ++compte;\n    cout << compte << ' ' << n << '\\n';\n} while (n > 0);",
          'Le do-while fait le tour AVANT de tester. n peut devenir négatif !'),
]

# ---------------- STAR PATTERNS ----------------
def star_fill(sid, title, code, choices, answer, explain, hint):
    good = run_cpp(code.replace('___', choices[answer]))
    for k, c in enumerate(choices):
        if k != answer:
            try:
                assert run_cpp(code.replace('___', c)) != good, (sid, c)
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                pass  # wrong choice doesn't compile or loops forever: clearly different
    return {'id': sid, 'type': 'fill', 'title': title, 'pattern': good.rstrip('\n'), 'code': code,
            'choices': choices, 'answer': answer, 'hint': hint, 'explain': explain}

def star_draw(sid, title, code, explain, hint):
    out = run_cpp(code).rstrip('\n').split('\n')
    rows = len(out); cols = max(len(l) for l in out) + 1
    return {'id': sid, 'type': 'draw', 'title': title, 'code': code, 'rows': rows, 'cols': cols,
            'grid': [l.ljust(cols) for l in out], 'hint': hint, 'explain': explain}

stars = [
    star_fill('et-triangle', 'Triangle qui grandit',
              "for (int ligne = 1; ligne <= 4; ++ligne)\n{\n    for (int col = 1; col <= ___; ++col)\n    {\n        cout << '*';\n    }\n    cout << '\\n';\n}",
              ['ligne', '4', 'ligne + 1', 'col'], 0,
              "La ligne 1 a 1 étoile, la ligne 2 en a 2... donc la boucle intérieure va jusqu'à `ligne`.",
              'Combien d\'étoiles sur la ligne 3 ?'),
    star_fill('et-inverse', 'Triangle à l\'envers',
              "for (int ligne = 4; ligne >= 1; ___)\n{\n    for (int col = 1; col <= ligne; ++col)\n    {\n        cout << '*';\n    }\n    cout << '\\n';\n}",
              ['--ligne', '++ligne', 'ligne = 1', '--col'], 0,
              "On part de 4 et on descend jusqu'à 1 : il faut `--ligne`. Avec `++ligne`, la boucle ne finirait jamais... ou presque 😵",
              'ligne commence à 4 et doit arriver à 1.'),
    star_fill('et-rectangle', 'Rectangle 3 × 5',
              "for (int ligne = 1; ligne <= 3; ++ligne)\n{\n    for (int col = 1; col ___ 5; ++col)\n    {\n        cout << '#';\n    }\n    cout << '\\n';\n}",
              ['<=', '<', '>=', '=='], 0,
              "Pour 5 colonnes avec col qui commence à 1, il faut `col <= 5`. Avec `<`, on n'en a que 4 : l'erreur « off-by-one » classique !",
              'col va de 1 à 5 inclus.'),
    star_draw('dessin-escalier', 'Dessine ce que ça affiche',
              "for (int i = 1; i <= 3; ++i)\n{\n    for (int j = 1; j <= i * 2; ++j)\n    {\n        cout << '*';\n    }\n    cout << '\\n';\n}",
              "Ligne i : `i * 2` étoiles → 2, 4, 6.", 'Calcule i * 2 pour chaque ligne.'),
    star_draw('dessin-carre', 'Dessine ce que ça affiche',
              "for (int i = 1; i <= 3; ++i)\n{\n    for (int j = 1; j <= 3; ++j)\n    {\n        if (i == j)\n        {\n            cout << 'X';\n        }\n        else\n        {\n            cout << '.';\n        }\n    }\n    cout << '\\n';\n}",
              "X seulement quand i == j : c'est la diagonale.", 'Le X apparaît quand ligne = colonne.'),
    star_draw('dessin-espaces', 'Dessine ce que ça affiche',
              "for (int i = 1; i <= 3; ++i)\n{\n    for (int e = 1; e <= 3 - i; ++e)\n    {\n        cout << ' ';\n    }\n    for (int j = 1; j <= i; ++j)\n    {\n        cout << '*';\n    }\n    cout << '\\n';\n}",
              "D'abord `3 - i` espaces, puis `i` étoiles : un triangle collé à droite.", 'Ligne 1 : 2 espaces puis 1 étoile.'),
]

# ---------------- MENU BUILDER ----------------
menu_code_ok = """int choix = -1;
do
{
    cout << "1. Jouer\\n2. Regles\\n0. Quitter\\n";
    cin >> choix;
    switch (choix)
    {
    case 1:
        cout << "C'est parti!\\n";
        break;
    case 2:
        cout << "Regles: miaou.\\n";
        break;
    case 0:
        cout << "Bye!\\n";
        break;
    default:
        cout << "Choix invalide\\n";
        break;
    }
} while (choix != 0);"""
# compile check (with input)
d = tempfile.mkdtemp()
open(f'{d}/m.cpp', 'w').write('#include <iostream>\nusing namespace std;\nint main()\n{\n' + menu_code_ok + '\n    return 0;\n}\n')
subprocess.run(['g++', '-std=c++20', '-Wall', '-Werror', f'{d}/m.cpp', '-o', f'{d}/m'], check=True)
o = subprocess.run([f'{d}/m'], input='1\n9\n0\n', capture_output=True, text=True).stdout
assert "C'est parti!" in o and 'Choix invalide' in o and o.endswith('Bye!\n')

menus = [{
    'id': 'menu-jeu',
    'title': 'Menu de jeu',
    'template': [
        'int choix = -1;',
        'do',
        '{',
        '    cout << "1. Jouer\\n2. Regles\\n0. Quitter\\n";',
        '    cin >> choix;',
        '    switch (choix)',
        '    {',
        '    [[0]]',
        '        cout << "C\'est parti!\\n";',
        '        [[1]]',
        '    case 2:',
        '        cout << "Regles: miaou.\\n";',
        '        break;',
        '    [[2]]',
        '        cout << "Bye!\\n";',
        '        break;',
        '    default:',
        '        cout << "Choix invalide\\n";',
        '        break;',
        '    }',
        '} while ([[3]]);',
    ],
    'answers': ['case 1:', 'break;', 'case 0:', 'choix != 0'],
    'blocks': ['case 1:', 'break;', 'case 0:', 'choix != 0', 'choix == 0', 'continue;', "case '1':"],
    'options': [
        {'key': '1', 'text': "C'est parti!"},
        {'key': '2', 'text': 'Regles: miaou.'},
        {'key': '0', 'text': 'Bye!', 'quit': True},
    ],
    'invalid': 'Choix invalide',
    'menuText': '1. Jouer\n2. Regles\n0. Quitter',
    'explain': {
        'choix == 0': "Avec `choix == 0`, le menu s'arrête dès que tu choisis autre chose que 0... l'inverse de ce qu'on veut !",
        'continue;': "`continue` dans un switch à l'intérieur d'une boucle saute à la fin du tour : ça marche par hasard ici, mais le prof veut `break;` pour sortir du switch.",
        "case '1':": "`'1'` est un caractère (code 49), pas l'entier 1. choix est un int : il faut `case 1:`.",
        'missing-break': "Sans `break;`, le case 1 « tombe » dans le case 2 : les deux messages s'affichent !",
    }
}]

data = {'tracers': tracers, 'traceTables': traceTables, 'stars': stars, 'menus': menus}
json.dump(data, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('ok', len(tracers), 'tracers', len(traceTables), 'tables', len(stars), 'stars', len(menus), 'menus')
