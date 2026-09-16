#!/usr/bin/env python3
"""Régénère le menu de secours (DEMO_CATEGORIES / DEMO_ITEMS) de index.html
depuis la base Supabase, entre les marqueurs MENU-FALLBACK.

Lancé toutes les 30 min par .github/workflows/menu-fallback.yml et à la main :
    python3 scripts/gen-menu-fallback.py            # écrit index.html si changement
    python3 scripts/gen-menu-fallback.py --check    # sort 1 si index.html n'est pas à jour

Lecture avec la clé anon (menu_categories / menu_items sont publics, le site
les lit avec la même clé) : aucun secret nécessaire.
"""
import json, re, sys, urllib.request

URL = "https://xbuftfwcyontgqbbrrjt.supabase.co"
ANON = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhidWZ0ZndjeW9udGdxYmJycmp0Iiwicm9s"
        "ZSI6ImFub24iLCJpYXQiOjE3NzA2Njg1NzksImV4cCI6MjA4NjI0NDU3OX0.ROkSccADlpLsWMgqyiX_xNaFdJNR8P4R-LJCnZV2Gzg")
START = "// >>> MENU-FALLBACK (généré par scripts/gen-menu-fallback.py — ne pas éditer à la main)"
END = "// <<< MENU-FALLBACK"


def rest(path):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", headers={"apikey": ANON, "Authorization": f"Bearer {ANON}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def js(s):
    return "'" + str(s if s is not None else "").replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ") + "'"


def build():
    cats = rest("menu_categories?select=id,nom,ordre,emoji&order=ordre,id")
    items = rest("menu_items?select=id,categorie_id,nom,description,prix,emoji,image_url&actif=eq.true&order=categorie_id,id")
    if len(cats) < 3 or len(items) < 10:
        sys.exit(f"Réponse suspecte ({len(cats)} catégories, {len(items)} articles) : on ne touche à rien")
    out = [START,
           "// Menu de secours = COPIE de la base (ids, prix, images identiques), régénéré toutes les 30 min.",
           "// Si Supabase ne répond pas au chargement, ce menu s'affiche ; create-payment revérifie les prix en base.",
           "const DEMO_CATEGORIES = ["]
    out += [f"  {{id:{c['id']}, nom:{js(c['nom'])}, ordre:{c['ordre']}, emoji:{js(c['emoji'])}}}," for c in cats]
    out += ["];", "", "const DEMO_ITEMS = ["]
    out += [f"  {{id:{i['id']}, categorie_id:{i['categorie_id']}, nom:{js(i['nom'])}, description:{js(i['description'])}, "
            f"prix:{float(i['prix']):.2f}, emoji:{js(i['emoji'])}, image_url:{js(i['image_url'])}, disponible:true}}," for i in items]
    out += ["];", END]
    return "\n".join(out), len(cats), len(items)


def main():
    check = "--check" in sys.argv
    html = open("index.html", encoding="utf-8").read()
    pat = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)
    if not pat.search(html):
        sys.exit("Marqueurs MENU-FALLBACK introuvables dans index.html")
    block, nc, ni = build()
    new = pat.sub(lambda m: block, html, count=1)
    if new == html:
        print(f"Menu de secours déjà à jour ({nc} catégories, {ni} articles)")
        return
    if check:
        sys.exit("index.html n'est pas à jour")
    open("index.html", "w", encoding="utf-8").write(new)
    print(f"index.html mis à jour ({nc} catégories, {ni} articles)")


if __name__ == "__main__":
    main()
