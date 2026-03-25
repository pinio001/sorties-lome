"""
sync_places.py
──────────────
Synchronise les données des spots Bingo228 :
  1. Google Places API  → horaires, budget, note Google
  2. TripAdvisor scraping → horaires + budget (fallback)
  3. Scraping site web  → menu + prix

Usage :
    python sync_places.py                      # tous les Bar/Resto
    python sync_places.py --limit 5 --dry-run  # test sans écriture
    python sync_places.py --id <uuid>          # un seul spot
    python sync_places.py --missing-only       # uniquement les spots sans horaires/budget

Variables d'environnement (.env.local ou GitHub Secrets) :
    GOOGLE_PLACES_API_KEY       (obligatoire)
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

import argparse, os, re, time
from datetime import datetime, timezone

try:
    import requests
    from bs4 import BeautifulSoup
    from supabase import create_client
    from dotenv import load_dotenv
except ImportError:
    print("❌  pip install requests beautifulsoup4 supabase python-dotenv")
    exit(1)

load_dotenv(".env.local") if os.path.exists(".env.local") else load_dotenv()

# ─── Config ───────────────────────────────────────────────────────────────────
GOOGLE_API_KEY      = os.environ["GOOGLE_PLACES_API_KEY"]
SUPABASE_URL        = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY        = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

GOOGLE_DAY_MAP = {0:"dim", 1:"lun", 2:"mar", 3:"mer", 4:"jeu", 5:"ven", 6:"sam"}
DAYS_FR        = ["lun","mar","mer","jeu","ven","sam","dim"]

BUDGET_MAP_GOOGLE = {
    "PRICE_LEVEL_FREE":           "F",
    "PRICE_LEVEL_INEXPENSIVE":    "F",
    "PRICE_LEVEL_MODERATE":       "FF",
    "PRICE_LEVEL_EXPENSIVE":      "FFF",
    "PRICE_LEVEL_VERY_EXPENSIVE": "FFF",
}

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; Bingo228Bot/1.0; +https://bingo228.com)"}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ══════════════════════════════════════════════════════════════════════════════
# 1. GOOGLE PLACES
# ══════════════════════════════════════════════════════════════════════════════

def google_search(name: str, location: str) -> dict | None:
    url  = "https://places.googleapis.com/v1/places:searchText"
    hdrs = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.regularOpeningHours,places.priceLevel,places.rating,places.websiteUri",
    }
    body = {
        "textQuery": f"{name} {location or ''} Lomé Togo",
        "languageCode": "fr",
        "locationBias": {"circle": {"center": {"latitude":6.1375,"longitude":1.2123}, "radius":20000.0}},
    }
    try:
        res = requests.post(url, headers=hdrs, json=body, timeout=10)
        places = res.json().get("places", [])
        return places[0] if places else None
    except Exception as e:
        print(f"    ⚠️  Google error: {e}")
        return None

def google_parse_hours(data: dict) -> dict | None:
    periods = data.get("regularOpeningHours", {}).get("periods", [])
    if not periods: return None
    hours = {d: None for d in DAYS_FR}
    for p in periods:
        od = p.get("open",{}).get("day"); oh = p.get("open",{}).get("hour",0); om = p.get("open",{}).get("minute",0)
        ch = p.get("close",{}).get("hour",0); cm = p.get("close",{}).get("minute",0)
        if od is None: continue
        dk = GOOGLE_DAY_MAP.get(od)
        if dk: hours[dk] = {"open": f"{oh:02d}:{om:02d}", "close": f"{ch:02d}:{cm:02d}"}
    return hours if any(v for v in hours.values()) else None


# ══════════════════════════════════════════════════════════════════════════════
# 2. TRIPADVISOR SCRAPING
# ══════════════════════════════════════════════════════════════════════════════

TA_BUDGET_RE = re.compile(r'(F+|(\$+))', re.UNICODE)
TA_HOUR_RE   = re.compile(r'(\d{1,2})[h:](\d{2})\s*[-–]\s*(\d{1,2})[h:](\d{2})')
TA_DAYS_MAP  = {
    "lundi":"lun","mardi":"mar","mercredi":"mer","jeudi":"jeu",
    "vendredi":"ven","samedi":"sam","dimanche":"dim",
    "monday":"lun","tuesday":"mar","wednesday":"mer","thursday":"jeu",
    "friday":"ven","saturday":"sam","sunday":"dim",
}

def tripadvisor_search(name: str, location: str) -> dict | None:
    """Cherche sur TripAdvisor et retourne horaires + budget si trouvés."""
    query = f"{name} {location} Lomé restaurant"
    search_url = f"https://www.tripadvisor.fr/Search?q={requests.utils.quote(query)}&searchSessionId=1"
    try:
        res  = requests.get(search_url, headers=HEADERS, timeout=12)
        soup = BeautifulSoup(res.text, "html.parser")

        # Cherche le premier lien restaurant
        link = None
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/Restaurant_Review" in href or "/Attraction_Review" in href:
                link = "https://www.tripadvisor.fr" + href if href.startswith("/") else href
                break

        if not link:
            return None

        # Scrape la page du restaurant
        time.sleep(0.8)
        page = requests.get(link, headers=HEADERS, timeout=12)
        return tripadvisor_parse(page.text)

    except Exception as e:
        print(f"    ⚠️  TripAdvisor error: {e}")
        return None

def tripadvisor_parse(html: str) -> dict | None:
    soup   = BeautifulSoup(html, "html.parser")
    text   = soup.get_text(" ", strip=True).lower()
    result = {}

    # Budget (cherche F/FF/FFF dans la page)
    budget_match = re.search(r'(F{1,3})', soup.get_text())
    if budget_match:
        b = len(budget_match.group(1))
        result["budget_range"] = "F" * min(b, 3)

    # Horaires — cherche patterns "lundi 18h00 - 02h00" etc.
    hours: dict = {d: None for d in DAYS_FR}
    found_hours = False
    for day_fr, day_key in TA_DAYS_MAP.items():
        # Cherche le jour dans le texte
        idx = text.find(day_fr)
        if idx == -1: continue
        segment = text[idx:idx+80]
        m = TA_HOUR_RE.search(segment)
        if m:
            hours[day_key] = {
                "open":  f"{int(m.group(1)):02d}:{m.group(2)}",
                "close": f"{int(m.group(3)):02d}:{m.group(4)}",
            }
            found_hours = True

    if found_hours:
        result["opening_hours"] = hours

    return result if result else None


# ══════════════════════════════════════════════════════════════════════════════
# 3. SCRAPING MENU (site web)
# ══════════════════════════════════════════════════════════════════════════════ (site web)
# ══════════════════════════════════════════════════════════════════════════════

PRICE_RE = re.compile(r"(\d[\d\s.,]*)\s*(F|FCFA|CFA|XOF|frs?)?", re.IGNORECASE)

def scrape_menu(url: str) -> list[dict]:
    if not url or not url.startswith("http"): return []
    try:
        res  = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")
        items = []
        for section in soup.find_all(lambda t: t.name in ["section","div","ul"] and
            any(kw in " ".join(t.get("class",[])+[t.get("id","")]) for kw in ["menu","carte","food","drink","plat","boisson"]))[:5]:
            cat = (section.find(["h2","h3","h4"]) or None)
            cat_name = cat.get_text(strip=True) if cat else "Menu"
            for row in section.find_all(["li","div","tr","p"]):
                text  = row.get_text(" ", strip=True)
                pm    = PRICE_RE.search(text)
                if not pm: continue
                try: price = float(pm.group(1).replace(" ","").replace(",","").replace(".",""))
                except: continue
                if price < 100 or price > 500_000: continue
                name_part = text[:pm.start()].strip(" -:•|")
                if 2 <= len(name_part) <= 80:
                    items.append({"category":cat_name,"item_name":name_part,"price":price,"currency":"FCFA"})
        seen, unique = set(), []
        for item in items:
            if item["item_name"] not in seen:
                seen.add(item["item_name"]); unique.append(item)
        return unique[:50]
    except Exception as e:
        print(f"    ⚠️  Menu scraping error: {e}"); return []


# ══════════════════════════════════════════════════════════════════════════════
# SYNC UN SPOT
# ══════════════════════════════════════════════════════════════════════════════

def sync_place(place: dict, dry_run: bool = False) -> dict:
    pid, name, loc = place["id"], place.get("name","?"), place.get("location","")
    has_hours  = bool(place.get("opening_hours"))
    has_budget = bool(place.get("budget_range"))
    print(f"\n  🔍 {name}")

    updates: dict = {}
    result = {"id":pid, "name":name, "status":"ok", "changes":[], "sources":[]}

    # ── 1. Google Places ──────────────────────────────────────────────────────
    gplace = google_search(name, loc)
    if gplace:
        print(f"    ✅ Google : {gplace.get('displayName',{}).get('text','?')}")
        result["sources"].append("google")

        gid = gplace.get("id")
        if gid: updates["google_place_id"] = gid

        if not has_hours:
            h = google_parse_hours(gplace)
            if h:
                updates["opening_hours"] = h
                has_hours = True
                result["changes"].append("horaires(google)")
                print(f"    🕐 Horaires Google : {sum(1 for v in h.values() if v)}j/sem")

        if not has_budget:
            b = BUDGET_MAP_GOOGLE.get(gplace.get("priceLevel",""))
            if b:
                updates["budget_range"] = b
                has_budget = True
                result["changes"].append("budget(google)")
                print(f"    💰 Budget Google : {b}")

        r = gplace.get("rating")
        if r:
            updates["google_rating"] = r
            result["changes"].append("rating")

        w = gplace.get("websiteUri")
        if w and not place.get("website_url"):
            updates["website_url"] = w
            result["changes"].append("website")

    else:
        print(f"    ❌ Non trouvé sur Google")
        result["status"] = "not_found_google"

    # ── 2. TripAdvisor (fallback) ─────────────────────────────────────
    if not has_hours or not has_budget:
        print(f"    🔄 TripAdvisor...")
        ta = tripadvisor_search(name, loc)
        if ta:
            result["sources"].append("tripadvisor")
            if not has_hours and ta.get("opening_hours"):
                updates["opening_hours"] = ta["opening_hours"]
                has_hours = True
                result["changes"].append("horaires(tripadvisor)")
                print(f"    🕐 Horaires TripAdvisor : trouvés")
            if not has_budget and ta.get("budget_range"):
                updates["budget_range"] = ta["budget_range"]
                has_budget = True
                result["changes"].append("budget(tripadvisor)")
                print(f"    💰 Budget TripAdvisor : {ta['budget_range']}")
        else:
            print(f"    ❌ Non trouvé sur TripAdvisor")
        time.sleep(0.5)

    # ── 3. Menu (scraping site web) ───────────────────────────────────────────
    menu_url   = place.get("website_url") or updates.get("website_url")
    menu_items = []
    if menu_url:
        menu_items = scrape_menu(menu_url)
        if menu_items:
            print(f"    🍽️  Menu : {len(menu_items)} items")
            result["changes"].append(f"menu({len(menu_items)})")

    # Résumé infos manquantes
    if not has_hours:  print(f"    ⚠️  Horaires introuvables sur toutes les sources")
    if not has_budget: print(f"    ⚠️  Budget introuvable sur toutes les sources")

    # ── 4. Écriture Supabase ──────────────────────────────────────────────────
    updates["last_synced_at"] = datetime.now(timezone.utc).isoformat()

    if not dry_run:
        if updates:
            supabase.from_("places").update(updates).eq("id", pid).execute()
        if menu_items:
            supabase.from_("menus").delete().eq("place_id", pid).execute()
            for item in menu_items:
                supabase.from_("menus").insert({**item, "place_id": pid}).execute()

    return result


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Bingo228 — Sync Places")
    parser.add_argument("--limit",        type=int,  default=None)
    parser.add_argument("--id",           type=str,  default=None)
    parser.add_argument("--dry-run",      action="store_true")
    parser.add_argument("--missing-only", action="store_true", help="Sync uniquement les spots sans horaires ou budget")
    parser.add_argument("--category",     type=str,  default="Bar/Resto")
    args = parser.parse_args()

    print(f"\n🚀 Bingo228 — Sync Places")
    print(f"   Catégorie    : {args.category}")
    print(f"   Missing only : {args.missing_only}")
    print(f"   Dry run      : {args.dry_run}")

    query = supabase.from_("places").select("id,name,location,website_url,google_place_id,opening_hours,budget_range")
    if args.id:
        query = query.eq("id", args.id)
    else:
        query = query.eq("category", args.category)
        if args.missing_only:
            query = query.or_("opening_hours.is.null,budget_range.is.null")

    if args.limit: query = query.limit(args.limit)
    places = query.execute().data or []

    print(f"\n📍 {len(places)} spots à traiter\n{'─'*50}")

    stats = {"ok":0, "not_found_google":0, "error":0}
    all_missing_hours, all_missing_budget = [], []

    for i, place in enumerate(places, 1):
        print(f"\n[{i}/{len(places)}]", end="")
        try:
            result = sync_place(place, dry_run=args.dry_run)
            stats[result.get("status","ok")] = stats.get(result.get("status","ok"),0)+1
            if "horaires" not in " ".join(result["changes"]) and not place.get("opening_hours"):
                all_missing_hours.append(place["name"])
            if "budget" not in " ".join(result["changes"]) and not place.get("budget_range"):
                all_missing_budget.append(place["name"])
        except Exception as e:
            print(f"\n    💥 Erreur : {e}")
            stats["error"] = stats.get("error",0)+1

        if i < len(places): time.sleep(0.5)

    print(f"\n\n{'─'*50}")
    print(f"✅ Terminé !")
    print(f"   Google trouvé  : {stats.get('ok',0)}")
    print(f"   Introuvables   : {stats.get('not_found_google',0)}")
    print(f"   Erreurs        : {stats.get('error',0)}")

    if all_missing_hours:
        print(f"\n⚠️  Encore sans horaires ({len(all_missing_hours)}) → à saisir manuellement :")
        for n in all_missing_hours: print(f"   - {n}")

    if all_missing_budget:
        print(f"\n⚠️  Encore sans budget ({len(all_missing_budget)}) → à saisir manuellement :")
        for n in all_missing_budget: print(f"   - {n}")

if __name__ == "__main__":
    main()