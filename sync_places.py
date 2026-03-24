"""
sync_places.py
──────────────
Script de synchronisation des données des spots Bingo228 :
  1. Google Places API → horaires, budget, note Google
  2. Scraping site web → menu + prix

Usage :
    python sync_places.py                    # tous les Bar/Resto
    python sync_places.py --limit 10         # 10 spots seulement (test)
    python sync_places.py --id <uuid>        # un seul spot

Variables d'environnement requises (.env ou GitHub Secrets) :
    GOOGLE_PLACES_API_KEY
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import json
import os
import re
import time
from datetime import datetime, timezone

# ─── Dépendances ──────────────────────────────────────────────────────────────
try:
    import requests
    from bs4 import BeautifulSoup
    from supabase import create_client
    from dotenv import load_dotenv
except ImportError:
    print("❌ Installe les dépendances : pip install requests beautifulsoup4 supabase python-dotenv")
    exit(1)

load_dotenv(".env.local") if os.path.exists(".env.local") else load_dotenv()

# ─── Config ───────────────────────────────────────────────────────────────────
GOOGLE_API_KEY  = os.environ["GOOGLE_PLACES_API_KEY"]
SUPABASE_URL    = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY    = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

DAYS_FR = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"]
# Google renvoie : 0=dim, 1=lun ... 6=sam
GOOGLE_DAY_MAP  = {0:"dim", 1:"lun", 2:"mar", 3:"mer", 4:"jeu", 5:"ven", 6:"sam"}

# Correspondance price_level → fourchette FCFA
BUDGET_MAP = {
    1: "€",   # < 5 000 F
    2: "€€",  # 5 000 – 15 000 F
    3: "€€€", # > 15 000 F
    4: "€€€",
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ─── Google Places ────────────────────────────────────────────────────────────

def search_place(name: str, location: str) -> dict | None:
    """Cherche un lieu sur Google Places et retourne le place_id + détails."""
    query = f"{name} {location or ''} Lomé Togo"
    url   = "https://places.googleapis.com/v1/places:searchText"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.regularOpeningHours,places.priceLevel,places.rating,places.websiteUri",
    }

    body = {
        "textQuery": query,
        "languageCode": "fr",
        "locationBias": {
            "circle": {
                "center": {"latitude": 6.1375, "longitude": 1.2123},
                "radius": 20000.0,
            }
        },
    }

    try:
        res  = requests.post(url, headers=headers, json=body, timeout=10)
        data = res.json()
        places = data.get("places", [])
        return places[0] if places else None
    except Exception as e:
        print(f"    ⚠️  Google Places error: {e}")
        return None


def parse_opening_hours(place_data: dict) -> dict | None:
    """Convertit les horaires Google en format Bingo228."""
    periods = place_data.get("regularOpeningHours", {}).get("periods", [])
    if not periods:
        return None

    hours: dict = {d: None for d in DAYS_FR}

    for period in periods:
        open_day   = period.get("open", {}).get("day")
        close_day  = period.get("close", {}).get("day")
        open_hour  = period.get("open", {}).get("hour", 0)
        open_min   = period.get("open", {}).get("minute", 0)
        close_hour = period.get("close", {}).get("hour", 0)
        close_min  = period.get("close", {}).get("minute", 0)

        if open_day is None:
            continue

        day_key = GOOGLE_DAY_MAP.get(open_day)
        if not day_key:
            continue

        hours[day_key] = {
            "open":  f"{open_hour:02d}:{open_min:02d}",
            "close": f"{close_hour:02d}:{close_min:02d}",
        }

    return hours if any(v for v in hours.values()) else None


def parse_budget(place_data: dict) -> str | None:
    """Convertit le price_level Google en budget."""
    level_str = place_data.get("priceLevel", "")
    # New API retourne "PRICE_LEVEL_INEXPENSIVE", "PRICE_LEVEL_MODERATE", etc.
    mapping = {
        "PRICE_LEVEL_FREE":        "€",
        "PRICE_LEVEL_INEXPENSIVE": "€",
        "PRICE_LEVEL_MODERATE":    "€€",
        "PRICE_LEVEL_EXPENSIVE":   "€€€",
        "PRICE_LEVEL_VERY_EXPENSIVE": "€€€",
    }
    return mapping.get(level_str)


# ─── Scraping Menu ────────────────────────────────────────────────────────────

PRICE_RE = re.compile(r"(\d[\d\s.,]*)\s*(F|FCFA|CFA|XOF|frs?)?", re.IGNORECASE)

def scrape_menu(url: str) -> list[dict]:
    """Tente d'extraire un menu depuis un site web."""
    if not url or not url.startswith("http"):
        return []

    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; Bingo228Bot/1.0)"}
        res = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        items = []

        # Cherche des patterns communs de menu
        # Méthode 1 : balises avec "menu" dans la classe ou id
        menu_sections = soup.find_all(
            lambda tag: tag.name in ["section", "div", "ul"]
            and any(
                kw in (tag.get("class", []) + [tag.get("id", "")])
                for kw in ["menu", "carte", "food", "drink", "plat", "boisson"]
            )
        )

        for section in menu_sections[:5]:
            # Cherche les items : ligne avec un nom et un prix
            rows = section.find_all(["li", "div", "tr", "p"])
            category = section.find(["h2", "h3", "h4"])
            cat_name = category.get_text(strip=True) if category else "Menu"

            for row in rows:
                text = row.get_text(" ", strip=True)
                price_match = PRICE_RE.search(text)
                if not price_match:
                    continue

                price_str = price_match.group(1).replace(" ", "").replace(",", "").replace(".", "")
                try:
                    price = float(price_str)
                except ValueError:
                    continue

                if price < 100 or price > 500_000:
                    continue

                # Nom = texte avant le prix
                name_part = text[:price_match.start()].strip(" -:•|")
                if len(name_part) < 2 or len(name_part) > 80:
                    continue

                items.append({
                    "category": cat_name,
                    "item_name": name_part,
                    "price": price,
                    "currency": "FCFA",
                })

        # Dédoublonner par nom
        seen = set()
        unique = []
        for item in items:
            if item["item_name"] not in seen:
                seen.add(item["item_name"])
                unique.append(item)

        return unique[:50]  # max 50 items par spot

    except Exception as e:
        print(f"    ⚠️  Scraping error ({url}): {e}")
        return []


# ─── Sync un spot ─────────────────────────────────────────────────────────────

def sync_place(place: dict, dry_run: bool = False) -> dict:
    pid  = place["id"]
    name = place.get("name", "?")
    loc  = place.get("location", "")
    print(f"\n  🔍 {name} ({loc})")

    result = {"id": pid, "name": name, "status": "ok", "changes": []}

    # 1. Google Places
    gplace = search_place(name, loc)
    updates: dict = {}

    if gplace:
        print(f"    ✅ Google trouvé : {gplace.get('displayName', {}).get('text', '?')}")

        # Place ID Google
        google_id = gplace.get("id")
        if google_id and google_id != place.get("google_place_id"):
            updates["google_place_id"] = google_id
            result["changes"].append("google_place_id")

        # Horaires
        hours = parse_opening_hours(gplace)
        if hours:
            updates["opening_hours"] = hours
            result["changes"].append("opening_hours")
            print(f"    🕐 Horaires : {sum(1 for v in hours.values() if v)} jours/semaine")

        # Budget
        budget = parse_budget(gplace)
        if budget:
            updates["budget_range"] = budget
            result["changes"].append("budget_range")
            print(f"    💰 Budget : {budget}")

        # Note Google
        rating = gplace.get("rating")
        if rating:
            updates["google_rating"] = rating
            result["changes"].append("google_rating")
            print(f"    ⭐ Note Google : {rating}")

        # Site web (si pas déjà renseigné)
        website = gplace.get("websiteUri")
        if website and not place.get("website_url"):
            updates["website_url"] = website
            result["changes"].append("website_url")

    else:
        print(f"    ❌ Non trouvé sur Google Places")
        result["status"] = "not_found"

    # 2. Scraping menu
    menu_url = place.get("website_url") or updates.get("website_url")
    menu_items = []
    if menu_url:
        menu_items = scrape_menu(menu_url)
        if menu_items:
            print(f"    🍽️  Menu : {len(menu_items)} items trouvés")
            result["changes"].append(f"menu({len(menu_items)})")
        else:
            print(f"    ℹ️  Menu : aucun item extrait")

    # 3. Mise à jour Supabase
    updates["last_synced_at"] = datetime.now(timezone.utc).isoformat()

    if not dry_run:
        if updates:
            err = supabase.from_("places").update(updates).eq("id", pid).execute()
            if hasattr(err, "error") and err.error:
                print(f"    ⚠️  Update error: {err.error}")
                result["status"] = "error"

        if menu_items:
            # Supprimer les anciens items auto-générés et réinsérer
            supabase.from_("menus").delete().eq("place_id", pid).execute()
            for item in menu_items:
                supabase.from_("menus").insert({**item, "place_id": pid}).execute()

    return result


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Bingo228 — Sync Places")
    parser.add_argument("--limit",   type=int, default=None, help="Nombre max de spots à traiter")
    parser.add_argument("--id",      type=str, default=None, help="ID d'un seul spot")
    parser.add_argument("--dry-run", action="store_true",    help="Ne pas écrire dans Supabase")
    parser.add_argument("--category",type=str, default="Bar/Resto", help="Catégorie à cibler")
    args = parser.parse_args()

    print(f"\n🚀 Bingo228 — Sync Places")
    print(f"   Catégorie : {args.category}")
    print(f"   Dry run   : {args.dry_run}")

    # Récupérer les spots
    query = supabase.from_("places").select(
        "id, name, location, website_url, maps_url, google_place_id, opening_hours"
    )

    if args.id:
        query = query.eq("id", args.id)
    else:
        query = query.eq("category", args.category)

    if args.limit:
        query = query.limit(args.limit)

    res    = query.execute()
    places = res.data or []

    print(f"\n📍 {len(places)} spots à traiter\n")
    print("─" * 50)

    stats = {"ok": 0, "not_found": 0, "error": 0}

    for i, place in enumerate(places, 1):
        print(f"\n[{i}/{len(places)}]", end="")
        result = sync_place(place, dry_run=args.dry_run)
        stats[result.get("status", "ok")] = stats.get(result.get("status", "ok"), 0) + 1

        # Pause pour respecter les limites Google
        if i < len(places):
            time.sleep(0.5)

    print(f"\n\n{'─' * 50}")
    print(f"✅ Terminé !")
    print(f"   Succès    : {stats.get('ok', 0)}")
    print(f"   Introuvables : {stats.get('not_found', 0)}")
    print(f"   Erreurs   : {stats.get('error', 0)}")


if __name__ == "__main__":
    main()