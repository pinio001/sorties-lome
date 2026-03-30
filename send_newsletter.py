"""
send_newsletter.py
──────────────────
Envoie automatiquement :
  1. --type events   → Events de la semaine (chaque lundi)
  2. --type spot     → Spot de la semaine (chaque lundi, spot aléatoire)
  3. --type new-event → Nouvel event ajouté (trigger à chaque ajout)

Variables d'environnement :
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    RESEND_API_KEY
    SITE_URL (ex: https://bingo228.com)
"""

import argparse, os, random
from datetime import datetime, timezone, timedelta

try:
    import requests
    from supabase import create_client
    from dotenv import load_dotenv
except ImportError:
    print("pip install requests supabase python-dotenv")
    exit(1)

load_dotenv(".env.local") if os.path.exists(".env.local") else load_dotenv()

SUPABASE_URL  = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
RESEND_KEY    = os.environ["RESEND_API_KEY"]
SITE_URL      = os.environ.get("SITE_URL", "https://bingo228.com")
FROM_EMAIL    = "Bingo228 <noreply@bingo228.com>"

db = create_client(SUPABASE_URL, SUPABASE_KEY)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_subscribers():
    """Retourne dict avec listes email et phone des abonnés newsletter."""
    res = db.from_("bingo_users").select("email, phone").eq("newsletter", True).execute()
    emails = [r["email"] for r in (res.data or []) if r.get("email")]
    phones = [r["phone"] for r in (res.data or []) if r.get("phone")]
    return {"emails": emails, "phones": phones}

def send_whatsapp_broadcast(phones: list[str], message: str):
    """Génère les liens wa.me pour envoi manuel ou via l'outil broadcast existant."""
    if not phones:
        return
    print(f"  📱 {len(phones)} numéros WhatsApp — liens générés dans wa_broadcast.txt")
    encoded = requests.utils.quote(message)
    lines = [f"https://wa.me/{p.replace('+','').replace(' ','')}?text={encoded}" for p in phones]
    with open("wa_broadcast.txt", "w") as f:
        f.write("\n".join(lines))
    print("  → Fichier wa_broadcast.txt créé")

def send_email(to_list: list[str], subject: str, html: str):
    if not to_list:
        print("  Aucun abonné.")
        return
    # Resend supporte le batch jusqu'à 50 destinataires par appel
    for i in range(0, len(to_list), 50):
        batch = to_list[i:i+50]
        res = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
            json={"from": FROM_EMAIL, "to": batch, "subject": subject, "html": html},
            timeout=15,
        )
        print(f"  Batch {i//50+1}: {res.status_code} — {len(batch)} destinataires")

def fmt_date(iso: str) -> str:
    try:
        d = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return d.strftime("%A %d %B").capitalize()
    except:
        return iso[:10]

def event_card_html(event: dict) -> str:
    image_tag = f'<img src="{event["image"]}" width="100%" style="border-radius:12px;max-height:200px;object-fit:cover;margin-bottom:12px;" />' if event.get("image") else ""
    date_str  = fmt_date(event["event_date"]) if event.get("event_date") else ""
    time_str  = event.get("event_time", "")[:5] if event.get("event_time") else ""
    return f"""
    <div style="background:#0c1220;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:20px;margin-bottom:16px;">
      {image_tag}
      <div style="font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">
        {date_str}{" · " + time_str if time_str else ""}
      </div>
      <div style="font-family:Georgia,serif;font-size:18px;font-weight:bold;color:#fff;margin-bottom:6px;">
        {event.get("title","?")}
      </div>
      {f'<div style="font-size:13px;color:rgba(255,255,255,.5);margin-bottom:14px;">📍 {event["location"]}</div>' if event.get("location") else ""}
      <a href="{SITE_URL}/event/{event['id']}"
        style="display:inline-block;background:#fff;color:#000;font-size:13px;font-weight:700;padding:10px 20px;border-radius:10px;text-decoration:none;">
        Voir l'event →
      </a>
    </div>"""

def email_wrapper(content: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bingo228</title></head>
<body style="margin:0;padding:0;background:#060a12;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#fff;width:40px;height:40px;border-radius:12px;line-height:40px;font-size:20px;font-weight:900;color:#000;margin-bottom:12px;">B</div>
      <div style="color:rgba(255,255,255,.4);font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Bingo228 · Lomé</div>
    </div>
    {content}
    <!-- Footer -->
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);text-align:center;">
      <a href="{SITE_URL}" style="color:rgba(255,255,255,.5);font-size:12px;text-decoration:none;">Voir le site</a>
      <span style="color:rgba(255,255,255,.2);margin:0 8px;">·</span>
      <span style="color:rgba(255,255,255,.3);font-size:11px;">© 2025 Bingo228</span>
    </div>
  </div>
</body></html>"""


# ─── 1. Events de la semaine ──────────────────────────────────────────────────

def send_weekly_events():
    now   = datetime.now(timezone.utc)
    start = now.strftime("%Y-%m-%d")
    end   = (now + timedelta(days=7)).strftime("%Y-%m-%d")

    res = db.from_("events").select("id,title,event_date,event_time,location,image") \
        .gte("event_date", start).lte("event_date", end) \
        .order("event_date").limit(6).execute()
    events = res.data or []

    if not events:
        print("  Aucun event cette semaine.")
        return

    cards = "".join(event_card_html(e) for e in events)
    content = f"""
    <h1 style="font-size:26px;font-weight:800;color:#fff;margin-bottom:6px;font-family:Georgia,serif;">
      Cette semaine à Lomé 🎉
    </h1>
    <p style="color:rgba(255,255,255,.45);font-size:14px;margin-bottom:28px;line-height:1.6;">
      {len(events)} événement{"s" if len(events)>1 else ""} sélectionné{"s" if len(events)>1 else ""} pour toi cette semaine.
    </p>
    {cards}
    <div style="text-align:center;margin-top:24px;">
      <a href="{SITE_URL}/events" style="display:inline-block;border:1px solid rgba(255,255,255,.2);color:#fff;font-size:13px;padding:12px 28px;border-radius:12px;text-decoration:none;">
        Voir tous les events →
      </a>
    </div>"""

    subs = get_subscribers()
    print(f"  {len(events)} events · {len(subs['emails'])} emails · {len(subs['phones'])} WhatsApp")
    send_email(subs["emails"], f"🎉 Cette semaine à Lomé — {len(events)} events à ne pas rater", email_wrapper(content))
    wa_msg = f"🎉 Cette semaine à Lomé :\n\n" + "\n".join(
        f"• {e.get('title','?')} — {e.get('event_date','')[:10]}" for e in events
    ) + f"\n\n👉 Voir tous les events : {SITE_URL}/events"
    send_whatsapp_broadcast(subs["phones"], wa_msg)


# ─── 2. Spot de la semaine ────────────────────────────────────────────────────

def send_weekly_spot():
    res = db.from_("places").select("id,name,category,location,description,image,budget_range") \
        .not_.is_("image", "null").execute()
    places = res.data or []
    if not places:
        print("  Aucun spot avec image.")
        return

    spot = random.choice(places)
    budget_map = {"€":"< 5 000 F","€€":"5–15 000 F","€€€":"> 15 000 F"}
    budget_str = budget_map.get(spot.get("budget_range",""),"")

    content = f"""
    <div style="font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.12em;margin-bottom:16px;">
      ✨ Spot de la semaine
    </div>
    <h1 style="font-size:28px;font-weight:800;color:#fff;margin-bottom:8px;font-family:Georgia,serif;">
      {spot["name"]}
    </h1>
    <div style="color:rgba(255,255,255,.45);font-size:13px;margin-bottom:20px;">
      📍 {spot.get("location","Lomé")}{f" · {spot['budget_range']} ({budget_str})" if budget_str else ""}
    </div>
    {"" if not spot.get("image") else f'<img src="{spot["image"]}" width="100%" style="border-radius:16px;max-height:260px;object-fit:cover;margin-bottom:20px;" />'}
    {f'<p style="color:rgba(255,255,255,.65);font-size:14px;line-height:1.7;margin-bottom:24px;">{spot["description"][:300]}{"…" if len(spot.get("description",""))>300 else ""}</p>' if spot.get("description") else ""}
    <div style="text-align:center;">
      <a href="{SITE_URL}/place/{spot['id']}"
        style="display:inline-block;background:#fff;color:#000;font-size:14px;font-weight:700;padding:14px 32px;border-radius:14px;text-decoration:none;">
        Découvrir {spot["name"]} →
      </a>
    </div>"""

    subs = get_subscribers()
    print(f"  Spot: {spot['name']} · {len(subs['emails'])} emails · {len(subs['phones'])} WhatsApp")
    send_email(subs["emails"], f"✨ Spot de la semaine : {spot['name']}", email_wrapper(content))
    wa_msg = f"✨ Spot de la semaine sur Bingo228 :\n\n*{spot['name']}*\n📍 {spot.get('location','Lomé')}\n\n{spot.get('description','')[:200]}\n\n👉 {SITE_URL}/place/{spot['id']}"
    send_whatsapp_broadcast(subs["phones"], wa_msg)


# ─── 3. Nouvel event ─────────────────────────────────────────────────────────

def send_new_event(event_id: str):
    res = db.from_("events").select("*").eq("id", event_id).maybeSingle().execute()
    event = res.data
    if not event:
        print(f"  Event {event_id} introuvable.")
        return

    card  = event_card_html(event)
    content = f"""
    <div style="font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.12em;margin-bottom:16px;">
      🔔 Nouvel event ajouté
    </div>
    <h1 style="font-size:24px;font-weight:800;color:#fff;margin-bottom:24px;font-family:Georgia,serif;">
      Un nouvel event vient d'être ajouté sur Bingo228 !
    </h1>
    {card}"""

    subs = get_subscribers()
    print(f"  Nouvel event: {event.get('title','?')} · {len(subs['emails'])} emails · {len(subs['phones'])} WhatsApp")
    send_email(subs["emails"], f"🔔 Nouvel event : {event.get('title','?')}", email_wrapper(content))
    wa_msg = f"🔔 Nouvel event sur Bingo228 !\n\n*{event.get('title','?')}*\n📍 {event.get('location','')}\n📅 {event.get('event_date','')[:10]}\n\n👉 {SITE_URL}/event/{event['id']}"
    send_whatsapp_broadcast(subs["phones"], wa_msg)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", choices=["events","spot","new-event"], required=True)
    parser.add_argument("--event-id", type=str, default=None, help="ID event pour --type new-event")
    args = parser.parse_args()

    print(f"\n📧 Bingo228 Newsletter — {args.type}")
    if args.type == "events":
        send_weekly_events()
    elif args.type == "spot":
        send_weekly_spot()
    elif args.type == "new-event":
        if not args.event_id:
            print("--event-id requis pour new-event")
            exit(1)
        send_new_event(args.event_id)

if __name__ == "__main__":
    main()