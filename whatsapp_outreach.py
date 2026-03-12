"""
whatsapp_outreach.py
────────────────────
Récupère les lieux depuis Supabase et génère les messages WhatsApp.

Usage :
    python whatsapp_outreach.py                    # toutes catégories
    python whatsapp_outreach.py --cat "Bar/Resto"  # une catégorie
    python whatsapp_outreach.py --cat "Bar/Resto" "Night Clubs"

    --mode html     → génère un fichier HTML cliquable (défaut)
    --mode browser  → ouvre les liens un par un dans le navigateur
    --mode csv      → génère un fichier CSV

Configuration :
    Mets tes clés dans un fichier .env à la racine :
    NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
"""

import argparse
import csv
import os
import time
import urllib.parse
import webbrowser
from datetime import datetime

# ─── Dépendances ─────────────────────────────────────────────────────────────
try:
    from supabase import create_client
except ImportError:
    print("❌ Installe supabase : pip install supabase python-dotenv")
    exit(1)

try:
    from dotenv import load_dotenv
    if os.path.exists(".env.local"):
        load_dotenv(".env.local")
    else:
        load_dotenv(".env")
except ImportError:
    pass  # pas obligatoire si les vars sont déjà dans l'env

# ─── Config ───────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

# Message envoyé aux établissements
MESSAGE_TEMPLATE = """Bonjour,

Nous sommes de *Bingo228* (bingo228.com), le guide des sorties à Lomé.

Votre établissement est référencé sur notre site et nous souhaiterions afficher vos *horaires d'ouverture exacts* pour mieux orienter vos clients.

Pourriez-vous nous communiquer :
• Jours d'ouverture (ex: Lun–Sam)
• Heure d'ouverture (ex: 12h00)
• Heure de fermeture (ex: 00h00)

Merci beaucoup ! 
*L'équipe Bingo228*"""

ALL_CATEGORIES = ["Bar/Resto", "Night Clubs", "Hôtels", "Loisirs"]

# ─── Helpers ─────────────────────────────────────────────────────────────────
def clean_phone(phone: str) -> str:
    """Normalise un numéro de téléphone pour wa.me"""
    cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
    if cleaned.startswith("+"):
        cleaned = cleaned[1:]
    return cleaned

def build_wa_link(phone: str, name: str) -> str:
    msg = MESSAGE_TEMPLATE.replace("{name}", name)
    encoded = urllib.parse.quote(msg)
    number = clean_phone(phone)
    return f"https://wa.me/{number}?text={encoded}"

def fetch_places(categories: list[str]) -> list[dict]:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ SUPABASE_URL ou SUPABASE_KEY manquant dans .env")
        exit(1)

    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"📡 Connexion Supabase... {SUPABASE_URL[:40]}...")

    query = client.table("places").select("id, name, category, location, whatsapp")

    if categories != ALL_CATEGORIES:
        query = query.in_("category", categories)

    response = query.execute()
    places = response.data or []

    # Filtre uniquement ceux avec un numéro WhatsApp
    with_wa = [p for p in places if (p.get("whatsapp") or "").strip()]
    without_wa = [p for p in places if not (p.get("whatsapp") or "").strip()]

    print(f"✅ {len(places)} lieux trouvés | {len(with_wa)} avec WhatsApp | {len(without_wa)} sans numéro")
    return with_wa

# ─── Modes ────────────────────────────────────────────────────────────────────
def mode_html(places: list[dict], output_file: str = "outreach.html"):
    """Génère un fichier HTML avec tous les liens cliquables"""
    rows = []
    for p in places:
        name = p.get("name", "?")
        phone = p.get("whatsapp", "").strip()
        category = p.get("category", "")
        location = p.get("location", "")
        link = build_wa_link(phone, name)
        rows.append((name, category, location, phone, link))

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bingo228 — Outreach WhatsApp</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, sans-serif; background: #0a0f1e; color: #fff; padding: 24px; }}
  h1 {{ font-size: 22px; margin-bottom: 4px; }}
  .sub {{ color: rgba(255,255,255,.4); font-size: 13px; margin-bottom: 24px; }}
  .stats {{ display: flex; gap: 12px; margin-bottom: 24px; }}
  .stat {{ background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 12px 20px; text-align: center; }}
  .stat strong {{ display: block; font-size: 22px; }}
  .stat span {{ font-size: 11px; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .1em; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
  th {{ text-align: left; padding: 10px 12px; color: rgba(255,255,255,.4); font-size: 10px; text-transform: uppercase; letter-spacing: .1em; border-bottom: 1px solid rgba(255,255,255,.08); }}
  td {{ padding: 12px; border-bottom: 1px solid rgba(255,255,255,.05); vertical-align: middle; }}
  tr:hover td {{ background: rgba(255,255,255,.03); }}
  .cat {{ font-size: 11px; background: rgba(255,255,255,.08); border-radius: 6px; padding: 2px 8px; }}
  .wa-btn {{
    display: inline-flex; align-items: center; gap: 6px;
    background: #25D366; color: #000; text-decoration: none;
    padding: 7px 14px; border-radius: 10px; font-size: 12px; font-weight: 600;
    transition: opacity .2s;
  }}
  .wa-btn:hover {{ opacity: .85; }}
  .num {{ color: rgba(255,255,255,.4); font-family: monospace; font-size: 12px; }}
  .filter {{ margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap; }}
  .filter input {{ background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); color: #fff; padding: 8px 12px; border-radius: 10px; font-size: 13px; width: 240px; outline: none; }}
  .filter input::placeholder {{ color: rgba(255,255,255,.3); }}
  .sent {{ background: rgba(34,197,94,.1) !important; }}
  .mark-btn {{ cursor: pointer; background: none; border: 1px solid rgba(255,255,255,.15); color: rgba(255,255,255,.5); padding: 6px 10px; border-radius: 8px; font-size: 11px; }}
  .mark-btn.done {{ background: rgba(34,197,94,.15); border-color: rgba(34,197,94,.3); color: #4ade80; }}
</style>
</head>
<body>
<h1>📲 Bingo228 — Outreach WhatsApp</h1>
<p class="sub">Généré le {datetime.now().strftime("%d/%m/%Y à %H:%M")} · {len(rows)} établissements</p>

<div class="stats">
  <div class="stat"><strong>{len(rows)}</strong><span>Avec WhatsApp</span></div>
  <div class="stat"><strong id="sent-count">0</strong><span>Envoyés</span></div>
  <div class="stat"><strong>{len(set(p.get('category','') for p in places))}</strong><span>Catégories</span></div>
</div>

<div class="filter">
  <input type="text" id="search" placeholder="🔍 Filtrer par nom ou lieu..." oninput="filterTable()">
</div>

<table id="table">
<thead>
  <tr>
    <th>#</th>
    <th>Établissement</th>
    <th>Catégorie</th>
    <th>Lieu</th>
    <th>Numéro</th>
    <th>Action</th>
    <th>Statut</th>
  </tr>
</thead>
<tbody>
"""
    for i, (name, cat, loc, phone, link) in enumerate(rows, 1):
        html += f"""  <tr id="row-{i}">
    <td style="color:rgba(255,255,255,.3)">{i}</td>
    <td><strong>{name}</strong></td>
    <td><span class="cat">{cat}</span></td>
    <td style="color:rgba(255,255,255,.5)">{loc}</td>
    <td class="num">{phone}</td>
    <td><a class="wa-btn" href="{link}" target="_blank" onclick="markRow({i})">💬 Envoyer</a></td>
    <td><button class="mark-btn" id="btn-{i}" onclick="toggleSent({i})">À envoyer</button></td>
  </tr>
"""

    html += """</tbody>
</table>

<script>
  const sentRows = new Set(JSON.parse(localStorage.getItem('sent') || '[]'));
  sentRows.forEach(i => applySent(i));
  updateCount();

  function markRow(i) {
    sentRows.add(i);
    applySent(i);
    localStorage.setItem('sent', JSON.stringify([...sentRows]));
    updateCount();
  }
  function toggleSent(i) {
    if (sentRows.has(i)) { sentRows.delete(i); clearSent(i); }
    else { sentRows.add(i); applySent(i); }
    localStorage.setItem('sent', JSON.stringify([...sentRows]));
    updateCount();
  }
  function applySent(i) {
    const row = document.getElementById('row-'+i);
    const btn = document.getElementById('btn-'+i);
    if (row) row.classList.add('sent');
    if (btn) { btn.textContent = '✅ Envoyé'; btn.classList.add('done'); }
  }
  function clearSent(i) {
    const row = document.getElementById('row-'+i);
    const btn = document.getElementById('btn-'+i);
    if (row) row.classList.remove('sent');
    if (btn) { btn.textContent = 'À envoyer'; btn.classList.remove('done'); }
  }
  function updateCount() {
    document.getElementById('sent-count').textContent = sentRows.size;
  }
  function filterTable() {
    const q = document.getElementById('search').value.toLowerCase();
    document.querySelectorAll('#table tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  }
</script>
</body>
</html>"""

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"\n✅ Fichier HTML généré : {output_file}")
    print(f"   Ouvre-le dans ton navigateur et clique sur 💬 Envoyer")
    webbrowser.open(f"file://{os.path.abspath(output_file)}")


def mode_browser(places: list[dict], delay: int = 4):
    """Ouvre les liens WhatsApp un par un dans le navigateur"""
    print(f"\n🌐 Mode navigateur — {len(places)} liens à ouvrir")
    print(f"   Délai entre chaque : {delay} secondes")
    print(f"   Appuie sur Ctrl+C pour stopper\n")

    for i, p in enumerate(places, 1):
        name = p.get("name", "?")
        phone = p.get("whatsapp", "").strip()
        link = build_wa_link(phone, name)

        print(f"  [{i}/{len(places)}] {name} ({phone})")
        webbrowser.open(link)

        if i < len(places):
            time.sleep(delay)

    print("\n✅ Tous les liens ont été ouverts.")


def mode_csv(places: list[dict], output_file: str = "outreach.csv"):
    """Génère un CSV avec les liens"""
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Nom", "Catégorie", "Lieu", "WhatsApp", "Lien wa.me", "Statut"])
        for p in places:
            name = p.get("name", "?")
            phone = p.get("whatsapp", "").strip()
            link = build_wa_link(phone, name)
            writer.writerow([name, p.get("category",""), p.get("location",""), phone, link, "À envoyer"])

    print(f"\n✅ CSV généré : {output_file}")
    print(f"   {len(places)} lignes exportées")


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Bingo228 — WhatsApp Outreach")
    parser.add_argument("--cat", nargs="+", default=ALL_CATEGORIES,
                        help="Catégories à cibler (ex: --cat 'Bar/Resto' 'Hôtels')")
    parser.add_argument("--mode", choices=["html", "browser", "csv"], default="html",
                        help="Mode de sortie (html, browser, csv)")
    parser.add_argument("--delay", type=int, default=4,
                        help="Délai en secondes entre chaque ouverture (mode browser)")
    args = parser.parse_args()

    print(f"\n🚀 Bingo228 — Outreach WhatsApp")
    print(f"   Catégories : {', '.join(args.cat)}")
    print(f"   Mode : {args.mode}\n")

    places = fetch_places(args.cat)

    if not places:
        print("❌ Aucun lieu trouvé avec un numéro WhatsApp.")
        return

    if args.mode == "html":
        mode_html(places)
    elif args.mode == "browser":
        mode_browser(places, delay=args.delay)
    elif args.mode == "csv":
        mode_csv(places)


if __name__ == "__main__":
    main()